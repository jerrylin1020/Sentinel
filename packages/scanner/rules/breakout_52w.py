"""52-Week High Breakout — fires when the latest close breaks above the highest
high of the trailing window (default ~252 trading days = 52 weeks)."""

from __future__ import annotations

from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


@rule(
    id="breakout_52w",
    name="52-Week High Breakout",
    category="technical",
    trigger_severity="p2",
    description="Latest close breaks above the trailing 52-week high (252 daily bars).",
    applies_to=["equity", "crypto"],
    weight=2.1,
    timeframe="1d",
    default_params={"lookback": 252, "min_break_pct": 0.0},
)
def breakout_52w(candles: list[Candle], params: dict) -> RuleHit | None:
    lookback = int(params["lookback"])
    min_break_pct = float(params.get("min_break_pct", 0.0))

    if len(candles) < lookback + 1:
        return None

    latest = candles[-1]
    window = candles[-(lookback + 1):-1]

    if latest.close <= 0:
        return None

    prior_high = max(c.high for c in window)
    if prior_high <= 0:
        return None

    break_pct = (latest.close - prior_high) / prior_high
    if break_pct < min_break_pct or latest.close <= prior_high:
        return None

    return RuleHit(
        rule_id="breakout_52w",
        severity="p2",
        detail=f"52-week high breakout (+{break_pct * 100:.1f}% over prior high)",
        metrics={
            "price": latest.close,
            "prior_high": round(prior_high, 4),
            "break_pct": round(break_pct, 4),
        },
    )
