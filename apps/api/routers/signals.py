from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from apps.api.db import get_session
from apps.api.models import Rule, Severity, Signal, Symbol

router = APIRouter(prefix="/signals", tags=["signals"])


@router.get("")
def list_signals(
    severity: Severity | None = None,
    limit: int = 100,
    session: Session = Depends(get_session),
):
    stmt = select(Signal).order_by(Signal.triggered_at.desc()).limit(limit)
    if severity is not None:
        stmt = stmt.where(Signal.severity == severity)

    out = []
    for sig in session.exec(stmt).all():
        sym = session.get(Symbol, sig.symbol_id)
        # rules = which specific rule(s) fired, with a human-readable reason —
        # not just the category tag, so the UI can show *why* a signal exists.
        rules = []
        tags = []
        extra = sig.extra or {}
        for rid in (sig.score_components or {}).keys():
            r = session.get(Rule, rid)
            entry = extra.get(rid) or {}
            # Older signals stored `extra[rule_id]` as the raw metrics dict
            # directly (no "detail" key) — fall back gracefully.
            detail = entry.get("detail", "") if isinstance(entry, dict) else ""
            rules.append(
                {
                    "id": rid,
                    "name": r.name if r else rid,
                    "category": r.category.value if r else "",
                    "detail": detail,
                }
            )
            if r:
                tags.append(r.category.value)
        out.append(
            {
                "id": sig.id,
                "ticker": sym.ticker if sym else "?",
                "name": sym.name if sym else "",
                "asset_type": sym.asset_type.value if sym else "",
                "severity": sig.severity.value,
                "score": sig.score,
                "tags": sorted(set(tags)),
                "rules": rules,
                "price": sig.price_at_trigger,
                "triggered_at": sig.triggered_at,
                "status": sig.status.value,
                "components": sig.score_components,
                "metrics": sig.extra,
            }
        )
    return out
