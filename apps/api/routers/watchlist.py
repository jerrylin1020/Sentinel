from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from apps.api.db import get_session
from apps.api.models import Symbol, WatchedSymbol

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("")
def list_watchlist(session: Session = Depends(get_session)):
    items = session.exec(select(WatchedSymbol)).all()
    out = []
    for w in items:
        sym = session.get(Symbol, w.symbol_id)
        out.append({"watched": w, "symbol": sym})
    return out


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


@router.delete("/{watched_id}", status_code=204)
def remove_watched(watched_id: int, session: Session = Depends(get_session)):
    w = session.get(WatchedSymbol, watched_id)
    if not w:
        raise HTTPException(404, "not found")
    session.delete(w)
    session.commit()
