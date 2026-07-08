"""Price Momentum — fires when the close has risen at least `min_return` over
the trailing `lookback` bars."""

from __future__ import annotations

from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


@rule(
    id="price_momentum",
    name="Price Momentum",
    category="technical",
    description="Close is up >= threshold over the trailing lookback window.",
    applies_to=["equity", "crypto"],
    weight=1.5,
    timeframe="1d",
    default_params={"lookback": 10, "min_return": 0.10},
)
def price_momentum(candles: list[Candle], params: dict) -> RuleHit | None:
    lookback = int(params["lookback"])
    min_return = float(params["min_return"])
    if len(candles) < lookback + 1:
        return None

    latest = candles[-1]
    past = candles[-(lookback + 1)]
    if past.close <= 0 or latest.close <= 0:
        return None

    ret = (latest.close - past.close) / past.close
    if ret < min_return:
        return None

    return RuleHit(
        rule_id="price_momentum",
        severity="observe",
        detail=f"+{ret * 100:.1f}% over {lookback} bars",
        metrics={"price": latest.close, "return": round(ret, 4)},
    )
