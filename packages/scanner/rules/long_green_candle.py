"""Long Green Candle — fires when the latest bar is a strong up bar whose body
(close - open) is a large fraction of its open price."""

from __future__ import annotations

from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


@rule(
    id="long_green_candle",
    name="Long Green Candle",
    category="technical",
    description="Latest bar closes up with a body >= threshold of its open.",
    applies_to=["equity", "crypto"],
    weight=1.6,
    timeframe="1d",
    default_params={"min_body_pct": 0.03},
)
def long_green_candle(candles: list[Candle], params: dict) -> RuleHit | None:
    min_body_pct = float(params["min_body_pct"])

    if not candles:
        return None

    latest = candles[-1]
    if latest.open <= 0 or latest.close <= latest.open:  # must be green
        return None

    body_pct = (latest.close - latest.open) / latest.open
    if body_pct < min_body_pct:
        return None

    return RuleHit(
        rule_id="long_green_candle",
        severity="observe",
        detail=f"Long green candle (body +{body_pct * 100:.1f}%)",
        metrics={
            "price": latest.close,
            "body_pct": round(body_pct, 4),
        },
    )
