from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from apps.api.db import get_session
from apps.api.models import Symbol
from packages.data.crypto.binance import fetch_klines
from packages.data.equity.yahoo import fetch_candles

router = APIRouter(prefix="/candles", tags=["candles"])

# UI timeframe -> (crypto interval, crypto limit) / (equity interval, equity range).
# Rules only ever evaluate daily candles (see packages/scanner) — 1w/1M/1h views are for
# visual context only, so signal markers are suppressed on the frontend for those.
_TIMEFRAMES: dict[str, dict[str, tuple[str, str | int]]] = {
    "1h": {"crypto": ("1h", 500), "equity": ("60m", "60d")},
    "1d": {"crypto": ("1d", 365), "equity": ("1d", "2y")},
    "1w": {"crypto": ("1w", 260), "equity": ("1wk", "10y")},
    "1M": {"crypto": ("1M", 120), "equity": ("1mo", "max")},
}


@router.get("/{ticker}")
def get_candles(
    ticker: str,
    timeframe: str = Query("1d", description="1h | 1d | 1w | 1M"),
    session: Session = Depends(get_session),
):
    sym = session.exec(select(Symbol).where(Symbol.ticker == ticker)).first()
    if not sym:
        raise HTTPException(404, "symbol not in watchlist")

    tf = _TIMEFRAMES.get(timeframe)
    if not tf:
        raise HTTPException(400, f"unsupported timeframe: {timeframe}")

    try:
        if sym.asset_type.value == "crypto":
            interval, limit = tf["crypto"]
            candles = fetch_klines(ticker, interval=interval, limit=limit)
        else:
            interval, rng = tf["equity"]
            candles = fetch_candles(ticker, rng=rng, interval=interval)
    except Exception as exc:
        raise HTTPException(502, f"data fetch failed: {exc}")

    # Lightweight Charts format: intraday needs a unix timestamp, daily+ just needs 'YYYY-MM-DD'.
    intraday = timeframe == "1h"
    return [
        {
            "time": int(c.ts.timestamp()) if intraday else c.ts.date().isoformat(),
            "open": c.open,
            "high": c.high,
            "low": c.low,
            "close": c.close,
            "volume": c.volume,
        }
        for c in candles
    ]

