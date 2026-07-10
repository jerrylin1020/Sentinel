from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from apps.api.db import get_session
from apps.api.models import Symbol, WatchedSymbol

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("")
def list_watchlist(session: Session = Depends(get_session)):
    items = session.exec(select(WatchedSymbol)).all()
    symbol_ids = {w.symbol_id for w in items}
    symbols_by_id = (
        {s.id: s for s in session.exec(select(Symbol).where(Symbol.id.in_(symbol_ids)))}
        if symbol_ids
        else {}
    )
    return [{"watched": w, "symbol": symbols_by_id.get(w.symbol_id)} for w in items]


@router.post("", status_code=201)
def add_symbol(payload: Symbol, session: Session = Depends(get_session)):
    session.add(payload)
    session.commit()
    session.refresh(payload)
    watched = WatchedSymbol(symbol_id=payload.id, enabled_rules=["volume_spike_2x"], channels=["telegram"])
    session.add(watched)
    session.commit()
    session.refresh(watched)
    return {"symbol": payload, "watched": watched}


@router.patch("/{watched_id}")
def update_watched(watched_id: int, payload: dict, session: Session = Depends(get_session)):
    w = session.get(WatchedSymbol, watched_id)
    if not w:
        raise HTTPException(404, "not found")
    for field in ("group", "p1_score_threshold", "volume_multiplier", "enabled_rules", "channels", "notes"):
        if field in payload:
            setattr(w, field, payload[field])
    session.add(w)
    session.commit()
    session.refresh(w)
    return w


@router.delete("/{watched_id}", status_code=204)
def remove_watched(watched_id: int, session: Session = Depends(get_session)):
    w = session.get(WatchedSymbol, watched_id)
    if not w:
        raise HTTPException(404, "not found")
    session.delete(w)
    session.commit()
