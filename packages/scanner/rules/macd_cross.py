"""MACD Bullish Cross — fires when the MACD line crosses above its signal line."""

from __future__ import annotations

from packages.scanner.indicators import macd
from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


@rule(
    id="macd_cross",
    name="MACD Bullish Cross",
    category="technical",
    description="MACD line crosses above its signal line.",
    applies_to=["equity", "crypto"],
    weight=1.7,
    timeframe="1d",
    default_params={"fast": 12, "slow": 26, "signal": 9},
)
def macd_cross(candles: list[Candle], params: dict) -> RuleHit | None:
    closes = [c.close for c in candles]
    macd_line, signal_line = macd(
        closes, int(params["fast"]), int(params["slow"]), int(params["signal"])
    )
    if len(macd_line) < 2 or len(signal_line) < 2:
        return None

    prev_diff = macd_line[-2] - signal_line[-2]
    latest_diff = macd_line[-1] - signal_line[-1]
    # Cross up: was at/below signal, now above.
    if not (prev_diff <= 0 < latest_diff):
        return None

    return RuleHit(
        rule_id="macd_cross",
        severity="p2",
        detail="MACD crossed above signal line",
        metrics={"price": candles[-1].close, "macd": round(macd_line[-1], 4)},
    )
