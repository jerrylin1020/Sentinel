"""200-Period MA Breakout — fires when the latest close crosses above its
trailing simple moving average (default 200 bars)."""

from __future__ import annotations

from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


def _sma(candles: list[Candle], period: int) -> float:
    window = candles[-period:]
    return sum(c.close for c in window) / len(window)


@rule(
    id="ma200_breakout",
    name="200MA Breakout",
    category="technical",
    trigger_severity="p2",
    description="Latest close crosses above its trailing 200-bar moving average.",
    applies_to=["equity", "crypto"],
    weight=1.8,
    timeframe="1d",
    default_params={"period": 200},
)
def ma200_breakout(candles: list[Candle], params: dict) -> RuleHit | None:
    period = int(params["period"])
    if len(candles) < period + 1:
        return None

    latest, prev = candles[-1], candles[-2]
    if latest.close <= 0:
        return None

    ma_now = _sma(candles, period)
    ma_prev = _sma(candles[:-1], period)

    # Cross up: previous bar at/below MA, latest bar above MA.
    if prev.close > ma_prev or latest.close <= ma_now:
        return None

    return RuleHit(
        rule_id="ma200_breakout",
        severity="p2",
        detail=f"Crossed above {period}MA ({ma_now:.2f})",
        metrics={"price": latest.close, "ma": round(ma_now, 4)},
    )
