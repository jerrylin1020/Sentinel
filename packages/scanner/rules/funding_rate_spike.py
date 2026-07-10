"""Funding Rate Spike — perpetual futures funding rate hits an extreme level,
signalling an overheated one-sided market (crowded longs paying shorts, or
vice versa). Positive rate = longs pay shorts (market euphoric); negative
rate = shorts pay longs (market fearful/short-squeeze risk).

Computed on Binance USD-M perpetual funding-rate settlements (every 8h) —
NOT daily candles. `series` here is a list[FundingRatePoint], not OHLCV bars.
"""

from __future__ import annotations

from packages.scanner.rules.base import rule
from packages.shared.types import FundingRatePoint, RuleHit


@rule(
    id="funding_rate_spike",
    name="Funding Rate Spike",
    category="onchain",
    trigger_severity="p2",
    description=(
        "Perpetual futures funding rate spikes beyond a threshold, "
        "signalling crowded long or short positioning."
    ),
    applies_to=["crypto"],
    weight=1.6,
    timeframe="8h",
    data_source="funding_rate",
    default_params={"threshold": 0.001},
)
def funding_rate_spike(series: list[FundingRatePoint], params: dict) -> RuleHit | None:
    threshold = float(params["threshold"])
    if not series:
        return None

    latest = series[-1]
    if abs(latest.rate) < threshold:
        return None

    direction = "crowded longs (euphoric)" if latest.rate > 0 else "crowded shorts (fearful)"
    return RuleHit(
        rule_id="funding_rate_spike",
        severity="p2",
        detail=f"Funding rate spike {latest.rate * 100:.3f}% per 8h ({direction})",
        metrics={"funding_rate": latest.rate},
    )
