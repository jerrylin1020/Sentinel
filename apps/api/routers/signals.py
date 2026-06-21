from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from apps.api.db import get_session
from apps.api.models import Severity, Signal

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
    return session.exec(stmt).all()
