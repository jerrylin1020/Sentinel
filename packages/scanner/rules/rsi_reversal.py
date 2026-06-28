"""RSI Reversal — fires when RSI crosses back up through the oversold line
(a mean-reversion bounce signal)."""

from __future__ import annotations

from packages.scanner.indicators import rsi
from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


@rule(
    id="rsi_reversal",
    name="RSI Oversold Reversal",
    category="technical",
    description="RSI crosses back above the oversold threshold.",
    applies_to=["equity", "crypto"],
    weight=1.6,
    default_params={"period": 14, "oversold": 30.0},
)
def rsi_reversal(candles: list[Candle], params: dict) -> RuleHit | None:
    period = int(params["period"])
    oversold = float(params["oversold"])

    closes = [c.close for c in candles]
    series = rsi(closes, period)
    if len(series) < 2:
        return None

    prev, latest = series[-2], series[-1]
    # Cross up through the oversold line.
    if not (prev < oversold <= latest):
        return None

    return RuleHit(
        rule_id="rsi_reversal",
        severity="p2",
        detail=f"RSI crossed up through {oversold:.0f} ({prev:.0f}→{latest:.0f})",
        metrics={"price": candles[-1].close, "rsi": round(latest, 2)},
    )
