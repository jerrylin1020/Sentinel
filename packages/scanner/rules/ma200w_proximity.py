"""200-Week MA Proximity — alerts when price is hovering very close to its
200-week moving average (a major long-term support/resistance level).

Computed on daily candles as the ~1000-trading-day SMA (200 weeks x 5 trading
days), which approximates the classic 200-week MA.
"""

from __future__ import annotations

from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


@rule(
    id="ma200w_proximity",
    name="200-Week MA Proximity",
    category="technical",
    description="Price is within a small band of its 200-week (≈1000-day) moving average.",
    applies_to=["equity", "crypto"],
    weight=1.8,
    timeframe="1d",
    default_params={"period": 1000, "proximity_pct": 0.03},
)
def ma200w_proximity(candles: list[Candle], params: dict) -> RuleHit | None:
    period = int(params["period"])
    proximity_pct = float(params["proximity_pct"])

    if len(candles) < period:
        return None

    latest = candles[-1]
    if latest.close <= 0:
        return None

    window = candles[-period:]
    ma = sum(c.close for c in window) / period
    if ma <= 0:
        return None

    distance = abs(latest.close - ma) / ma
    if distance > proximity_pct:
        return None

    side = "above" if latest.close >= ma else "below"
    return RuleHit(
        rule_id="ma200w_proximity",
        severity="p2",
        detail=f"Price within {distance * 100:.1f}% of 200-week MA ({ma:.2f}, {side})",
        metrics={"price": latest.close, "ma": round(ma, 4), "distance": round(distance, 4)},
    )
