from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from apps.api.db import get_session
from apps.api.models import Symbol
from packages.data.crypto.binance import fetch_klines
from packages.data.equity.yahoo import fetch_candles

router = APIRouter(prefix="/candles", tags=["candles"])


@router.get("/{ticker}")
def get_candles(ticker: str, session: Session = Depends(get_session)):
    sym = session.exec(select(Symbol).where(Symbol.ticker == ticker)).first()
    if not sym:
        raise HTTPException(404, "symbol not in watchlist")

    try:
        if sym.asset_type.value == "crypto":
            candles = fetch_klines(ticker, interval="1d", limit=365)
        else:
            candles = fetch_candles(ticker, rng="1y", interval="1d")
    except Exception as exc:
        raise HTTPException(502, f"data fetch failed: {exc}")

    # Lightweight Charts format: time as 'YYYY-MM-DD'.
    return [
        {
            "time": c.ts.date().isoformat(),
            "open": c.open,
            "high": c.high,
            "low": c.low,
            "close": c.close,
            "volume": c.volume,
        }
        for c in candles
    ]
