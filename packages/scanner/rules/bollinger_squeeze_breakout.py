"""Bollinger Squeeze Breakout — fires when a period of unusually tight
volatility (band width contraction, a.k.a. a "squeeze") is immediately
followed by a close breaking above the upper band. This is a stricter,
rarer cousin of `bollinger_breakout`: it only fires after a genuine
volatility contraction, filtering out breakouts that happen when bands are
already wide (chasing an extended move)."""

from __future__ import annotations

from statistics import median, pstdev

from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


def _band_width(closes: list[float], period: int, k: float) -> float | None:
    """Relative Bollinger band width ((upper - lower) / mid) for the trailing
    `period` closes ending at the last element of `closes`."""
    if len(closes) < period:
        return None
    window = closes[-period:]
    mid = sum(window) / period
    if mid <= 0:
        return None
    sd = pstdev(window)
    return (2 * k * sd) / mid


@rule(
    id="bollinger_squeeze_breakout",
    name="Bollinger Squeeze Breakout",
    category="technical",
    description="Band-width contraction (squeeze) followed by a breakout above the upper band.",
    applies_to=["equity", "crypto"],
    weight=1.9,
    timeframe="1d",
    default_params={"period": 20, "std": 2.0, "squeeze_lookback": 60, "squeeze_ratio": 0.5},
)
def bollinger_squeeze_breakout(candles: list[Candle], params: dict) -> RuleHit | None:
    period = int(params["period"])
    k = float(params["std"])
    lookback = int(params["squeeze_lookback"])
    squeeze_ratio = float(params["squeeze_ratio"])

    if len(candles) < period + lookback + 1:
        return None

    latest = candles[-1]
    if latest.close <= 0:
        return None

    closes_all = [c.close for c in candles]

    window = closes_all[-period:]
    mid = sum(window) / period
    sd = pstdev(window)
    if sd <= 0:
        return None
    upper = mid + k * sd
    if latest.close <= upper:
        return None  # no breakout today

    # Squeeze precondition: yesterday's band width vs. its own recent history.
    width_yesterday = _band_width(closes_all[:-1], period, k)
    if width_yesterday is None:
        return None

    historical_widths = []
    n = len(closes_all)
    for end in range(n - 1 - lookback, n - 1):
        w = _band_width(closes_all[: end + 1], period, k)
        if w is not None:
            historical_widths.append(w)
    if len(historical_widths) < lookback // 2:
        return None

    typical_width = median(historical_widths)
    if typical_width <= 0 or width_yesterday > squeeze_ratio * typical_width:
        return None  # bands weren't actually tight before the breakout

    return RuleHit(
        rule_id="bollinger_squeeze_breakout",
        severity="p2",
        detail=(
            f"Breakout above {upper:.2f} after a volatility squeeze "
            f"(width {width_yesterday:.3f} vs typical {typical_width:.3f})"
        ),
        metrics={
            "price": latest.close,
            "upper": round(upper, 4),
            "width_before": round(width_yesterday, 4),
            "typical_width": round(typical_width, 4),
        },
    )
