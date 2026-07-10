"""Golden Cross — fires when the 50-bar SMA crosses above the 200-bar SMA
(a classic long-term bullish trend confirmation)."""

from __future__ import annotations

from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


def _sma(candles: list[Candle], period: int) -> float:
    window = candles[-period:]
    return sum(c.close for c in window) / len(window)


@rule(
    id="golden_cross",
    name="Golden Cross",
    category="technical",
    trigger_severity="p2",
    description="Fast (50-bar) moving average crosses above the slow (200-bar) moving average.",
    applies_to=["equity", "crypto"],
    weight=2.0,
    timeframe="1d",
    default_params={"fast_period": 50, "slow_period": 200},
)
def golden_cross(candles: list[Candle], params: dict) -> RuleHit | None:
    fast_p = int(params["fast_period"])
    slow_p = int(params["slow_period"])
    if len(candles) < slow_p + 1:
        return None

    fast_now = _sma(candles, fast_p)
    slow_now = _sma(candles, slow_p)
    fast_prev = _sma(candles[:-1], fast_p)
    slow_prev = _sma(candles[:-1], slow_p)

    # Cross up: fast was at/below slow, now strictly above.
    if fast_prev > slow_prev or fast_now <= slow_now:
        return None

    return RuleHit(
        rule_id="golden_cross",
        severity="p2",
        detail=f"{fast_p}MA crossed above {slow_p}MA ({fast_now:.2f} > {slow_now:.2f})",
        metrics={"price": candles[-1].close, "fast_ma": round(fast_now, 4), "slow_ma": round(slow_now, 4)},
    )
