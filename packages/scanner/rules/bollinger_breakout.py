"""Bollinger Band Breakout — fires when the latest close pushes above the upper
Bollinger band (SMA + k * stddev)."""

from __future__ import annotations

from statistics import pstdev

from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


@rule(
    id="bollinger_breakout",
    name="Bollinger Band Break",
    category="technical",
    trigger_severity="p2",
    description="Latest close breaks above the upper Bollinger band.",
    applies_to=["equity", "crypto"],
    weight=1.7,
    timeframe="1d",
    default_params={"period": 20, "std": 2.0},
)
def bollinger_breakout(candles: list[Candle], params: dict) -> RuleHit | None:
    period = int(params["period"])
    k = float(params["std"])
    if len(candles) < period + 1:
        return None

    latest = candles[-1]
    if latest.close <= 0:
        return None

    window = [c.close for c in candles[-period:]]
    mid = sum(window) / period
    sd = pstdev(window)
    if sd <= 0:
        return None

    upper = mid + k * sd
    if latest.close <= upper:
        return None

    return RuleHit(
        rule_id="bollinger_breakout",
        severity="p2",
        detail=f"Closed above upper Bollinger band ({upper:.2f})",
        metrics={"price": latest.close, "upper": round(upper, 4), "mid": round(mid, 4)},
    )
