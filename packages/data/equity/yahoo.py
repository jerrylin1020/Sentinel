"""Yahoo Finance chart adapter (free, rate-limited — cache in production).

Uses the public query1 chart endpoint; no API key required.
"""

from __future__ import annotations

from datetime import datetime, timezone

import httpx

from packages.shared.types import Candle

_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"


def fetch_candles(symbol: str, rng: str = "3mo", interval: str = "1d") -> list[Candle]:
    resp = httpx.get(
        _URL.format(symbol=symbol),
        params={"range": rng, "interval": interval},
        headers={"User-Agent": "Mozilla/5.0 (Sentinel scanner)"},
        timeout=10.0,
    )
    resp.raise_for_status()
    result = resp.json()["chart"]["result"][0]
    ts = result["timestamp"]
    q = result["indicators"]["quote"][0]

    candles: list[Candle] = []
    for i, t in enumerate(ts):
        o, h, l, c, v = q["open"][i], q["high"][i], q["low"][i], q["close"][i], q["volume"][i]
        if None in (o, h, l, c, v):  # data quality guard
            continue
        candles.append(
            Candle(
                ts=datetime.fromtimestamp(t, tz=timezone.utc),
                open=float(o), high=float(h), low=float(l), close=float(c), volume=float(v),
            )
        )
    return candles
