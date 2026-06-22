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
        # tags = rule categories that contributed to this signal's score
        tags = []
        for rid in (sig.score_components or {}).keys():
            r = session.get(Rule, rid)
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
                "price": sig.price_at_trigger,
                "triggered_at": sig.triggered_at,
                "status": sig.status.value,
                "components": sig.score_components,
                "metrics": sig.extra,
            }
        )
    return out
