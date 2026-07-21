"""HTTP-triggered scan endpoint for external cron services.

GitHub Actions `schedule` cron is best-effort and can be delayed well beyond
its configured interval under load, so this endpoint lets a precise, free
external cron service (e.g. cron-job.org, EasyCron) hit the API directly
every 5 minutes and get a real, timely trigger instead.

Protected by a shared secret (CRON_SECRET) so random internet traffic can't
spam the scan job. If CRON_SECRET is unset, the endpoint is disabled (404) —
this keeps local/dev safe by default.
"""

from fastapi import APIRouter, Header, HTTPException, Query

from apps.api.config import settings
from apps.api.services.scan_job import run_scan

import traceback

router = APIRouter(prefix="/cron", tags=["cron"])


@router.post("/scan")
@router.get("/scan")  # some free cron services only support GET
def trigger_scan(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
    token: str | None = Query(default=None, description="fallback for cron services that can't set headers"),
):
    if not settings.cron_secret:
        raise HTTPException(404, "cron endpoint disabled")
    if settings.cron_secret not in (x_cron_secret, token):
        raise HTTPException(401, "invalid or missing cron secret")

    try:
        summary = run_scan()
        hits = sum(1 for e in summary if "signal_id" in e)
        return {"scanned": len(summary), "signals": hits, "detail": summary}
    except Exception as exc:
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail={"error": str(exc), "traceback": tb})
