"""Binance klines adapter (free, no key needed for market data).

Falls back to the data-api host which is friendlier in some regions
(handoff §13: Binance may need a backup domain).
"""

from __future__ import annotations

from datetime import datetime, timezone

import httpx

from packages.shared.types import Candle

_HOSTS = ["https://api.binance.com", "https://data-api.binance.vision"]


def fetch_klines(symbol: str, interval: str = "1d", limit: int = 50) -> list[Candle]:
    """Fetch OHLCV candles for e.g. symbol="BTCUSDT"."""
    last_err: Exception | None = None
    for host in _HOSTS:
        try:
            resp = httpx.get(
                f"{host}/api/v3/klines",
                params={"symbol": symbol, "interval": interval, "limit": limit},
                timeout=10.0,
            )
            resp.raise_for_status()
            return [_to_candle(row) for row in resp.json()]
        except Exception as exc:  # try next host
            last_err = exc
            continue
    raise RuntimeError(f"Binance klines failed for {symbol}: {last_err}")


def _to_candle(row: list) -> Candle:
    # [openTime, open, high, low, close, volume, ...]
    return Candle(
        ts=datetime.fromtimestamp(row[0] / 1000, tz=timezone.utc),
        open=float(row[1]),
        high=float(row[2]),
        low=float(row[3]),
        close=float(row[4]),
        volume=float(row[5]),
    )
