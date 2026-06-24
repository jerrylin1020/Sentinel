"""Volume Spike rule — fires when the latest bar's volume is N x the recent
average. The single end-to-end rule implemented for Phase 1."""

from __future__ import annotations

from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


@rule(
    id="volume_spike_2x",
    name="Volume Spike",
    category="volume",
    description="Latest volume exceeds N x the trailing average volume.",
    applies_to=["equity", "crypto"],
    weight=2.4,
    default_params={"multiplier": 2.0, "lookback": 20, "min_price": 0.0},
)
def volume_spike(candles: list[Candle], params: dict) -> RuleHit | None:
    multiplier = float(params["multiplier"])
    lookback = int(params["lookback"])
    min_price = float(params.get("min_price", 0.0))

    if len(candles) < lookback + 1:
        return None

    latest = candles[-1]
    window = candles[-(lookback + 1):-1]

    # Data quality guard: skip on NaN / zero (see handoff §13).
    if latest.close <= 0 or latest.volume <= 0 or latest.close < min_price:
        return None

    avg_volume = sum(c.volume for c in window) / len(window)
    if avg_volume <= 0:
        return None

    ratio = latest.volume / avg_volume
    if ratio < multiplier:
        return None

    return RuleHit(
        rule_id="volume_spike_2x",
        severity="p2",
        detail=f"Volume {ratio:.1f}x trailing {lookback}-bar average",
        metrics={
            "volume_multiplier": round(ratio, 2),
            "price": latest.close,
            "avg_volume": round(avg_volume, 2),
            "latest_volume": latest.volume,
        },
    )
