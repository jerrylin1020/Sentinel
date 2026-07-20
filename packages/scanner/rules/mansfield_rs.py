"""Mansfield Relative Strength (MRS) — measures asset performance relative to a
benchmark (e.g. ^GSPC for equity, BTCUSDT for crypto).
Fires when Near-term MRS crosses above Far-term MRS and both are > 0 (Sector Rotation).
"""

from __future__ import annotations

from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


def _calculate_mrs(rsd_list: list[float], period: int) -> list[float]:
    """Calculate MRS series over RSD values.
    RSD list must be aligned. Returns list of same length, padded with 0.0."""
    if len(rsd_list) < period:
        return [0.0] * len(rsd_list)

    out = [0.0] * (period - 1)
    for i in range(period - 1, len(rsd_list)):
        window = rsd_list[i - period + 1 : i + 1]
        sma = sum(window) / period
        if sma > 0:
            mrs = ((rsd_list[i] / sma) - 1) * 100.0
        else:
            mrs = 0.0
        out.append(mrs)
    return out


@rule(
    id="mansfield_rs",
    name="Mansfield Relative Strength",
    category="technical",
    trigger_severity="p2",
    description="Near-term MRS is greater than Far-term MRS and both are positive (relative strength momentum).",
    applies_to=["equity", "crypto"],
    weight=2.0,
    timeframe="1d",
    default_params={"near_period": 20, "far_period": 123},
)
def mansfield_rs(candles: list[Candle], params: dict) -> RuleHit | None:
    near_p = int(params["near_period"])
    far_p = int(params["far_period"])

    bench_candles = params.get("_benchmark_candles")
    if not bench_candles or not isinstance(bench_candles, list):
        return None

    # Map benchmark close by date (timezone-naive comparison)
    bench_by_date = {b.ts.date(): b.close for b in bench_candles if b.close > 0}

    # Align candles and calculate RSD
    rsd_list: list[float] = []
    active_dates: list[any] = []
    for c in candles:
        dt = c.ts.date()
        if dt in bench_by_date:
            rsd = (c.close / bench_by_date[dt]) * 100.0
            rsd_list.append(rsd)
            active_dates.append(dt)

    if len(rsd_list) < far_p + 1:
        return None

    # Calculate Near and Far MRS
    mrs_near = _calculate_mrs(rsd_list, near_p)
    mrs_far = _calculate_mrs(rsd_list, far_p)

    near_now, near_prev = mrs_near[-1], mrs_near[-2]
    far_now, far_prev = mrs_far[-1], mrs_far[-2]

    # Near > Far, and both are now > 0
    is_positive = (near_now > far_now) and (near_now > 0) and (far_now > 0)

    # Check for RS Momentum (acceleration)
    rs_accel = far_now > far_prev

    if not is_positive:
        return None

    return RuleHit(
        rule_id="mansfield_rs",
        severity="p2",
        detail=f"Near MRS crossed above Far MRS ({near_now:.2f} > {far_now:.2f})",
        metrics={
            "price": candles[-1].close,
            "near_mrs": round(near_now, 4),
            "far_mrs": round(far_now, 4),
            "accelerating": rs_accel,
        },
    )
