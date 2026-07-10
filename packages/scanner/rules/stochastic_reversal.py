"""Stochastic Oversold Reversal — fires when the fast stochastic %K crosses
back up through the oversold line (a mean-reversion bounce signal, similar
spirit to rsi_reversal but a different oscillator for signal diversity)."""

from __future__ import annotations

from packages.scanner.indicators import stochastic_k
from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


@rule(
    id="stochastic_reversal",
    name="Stochastic Oversold Reversal",
    category="technical",
    trigger_severity="p2",
    description="Fast stochastic %K crosses back above the oversold threshold.",
    applies_to=["equity", "crypto"],
    weight=1.5,
    timeframe="1d",
    default_params={"period": 14, "oversold": 20.0},
)
def stochastic_reversal(candles: list[Candle], params: dict) -> RuleHit | None:
    period = int(params["period"])
    oversold = float(params["oversold"])

    highs = [c.high for c in candles]
    lows = [c.low for c in candles]
    closes = [c.close for c in candles]
    series = stochastic_k(highs, lows, closes, period)
    if len(series) < 2:
        return None

    prev, latest = series[-2], series[-1]
    # Cross up through the oversold line.
    if not (prev < oversold <= latest):
        return None

    return RuleHit(
        rule_id="stochastic_reversal",
        severity="p2",
        detail=f"Stochastic %K crossed up through {oversold:.0f} ({prev:.0f}→{latest:.0f})",
        metrics={"price": candles[-1].close, "stoch_k": round(latest, 2)},
    )
