from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from apps.api.db import get_session
from apps.api.models import ScanRun

router = APIRouter(prefix="/scan-runs", tags=["scan-runs"])


@router.get("/latest")
def latest_scan_run(session: Session = Depends(get_session)):
    run = session.exec(select(ScanRun).order_by(ScanRun.started_at.desc())).first()
    if run is None:
        return None
    return {
        "started_at": run.started_at,
        "finished_at": run.finished_at,
        "status": run.status,
        "scanned_symbols": run.scanned_symbols,
        "matched_symbols": run.matched_symbols,
        "failed_symbols": run.failed_symbols,
        "errors": run.errors,
    }
