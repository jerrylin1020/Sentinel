"""VCP (Volatility Contraction Pattern) Contraction — checks if the asset is
undergoing a series of decreasing pullbacks (Supply Drying Up) with volume contraction.
"""

from __future__ import annotations

from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


def _find_peaks_and_troughs(candles: list[Candle], window: int = 5) -> tuple[list[int], list[int]]:
    """Return indices of local peaks and troughs."""
    peaks = []
    troughs = []
    n = len(candles)
    for i in range(window, n - window):
        c = candles[i]

        # Check if i is a peak: must be strictly > all neighbors in window
        is_peak = True
        for j in range(i - window, i + window + 1):
            if j == i:
                continue
            if candles[j].high >= c.high:
                is_peak = False
                break
        if is_peak:
            peaks.append(i)

        # Check if i is a trough: must be strictly < all neighbors in window
        is_trough = True
        for j in range(i - window, i + window + 1):
            if j == i:
                continue
            if candles[j].low <= c.low:
                is_trough = False
                break
        if is_trough:
            troughs.append(i)

    return peaks, troughs


@rule(
    id="vcp_contraction",
    name="VCP Contraction",
    category="technical",
    trigger_severity="p2",
    description="Volatility Contraction Pattern (VCP) - successive pullbacks decreasing in depth with volume exhaustion.",
    applies_to=["equity", "crypto"],
    weight=1.9,
    timeframe="1d",
    default_params={"lookback": 120, "extrema_window": 5, "max_final_depth": 0.10, "vol_ratio": 0.50},
)
def vcp_contraction(candles: list[Candle], params: dict) -> RuleHit | None:
    lookback = int(params["lookback"])
    extrema_window = int(params["extrema_window"])
    max_final_depth = float(params["max_final_depth"])
    vol_ratio = float(params["vol_ratio"])

    if len(candles) < lookback:
        return None

    # Narrow our search window to the trailing lookback period
    sub_candles = candles[-lookback:]
    peaks, troughs = _find_peaks_and_troughs(sub_candles, extrema_window)

    # We need at least 2 peaks to establish a sequence of pullbacks
    if len(peaks) < 2:
        return None

    # Map sub-candle indices back to the global index space
    offset = len(candles) - lookback
    peaks = [p + offset for p in peaks]

    # Calculate pullback depths between consecutive peaks
    depths: list[float] = []
    pivot_highs: list[float] = []
    trough_lows: list[float] = []
    trough_indices: list[int] = []

    for i in range(len(peaks) - 1):
        p_start = peaks[i]
        p_end = peaks[i + 1]

        # Find the lowest trough index between these two peaks
        range_candles = candles[p_start : p_end + 1]
        if not range_candles:
            continue
        lowest_val = min(c.low for c in range_candles)
        lowest_idx = p_start + [c.low for c in range_candles].index(lowest_val)

        p_high = candles[p_start].high
        if p_high <= 0:
            continue

        depth = (p_high - lowest_val) / p_high
        depths.append(depth)
        pivot_highs.append(p_high)
        trough_lows.append(lowest_val)
        trough_indices.append(lowest_idx)

    # Include the final pullback (after the last peak)
    last_p = peaks[-1]
    range_candles = candles[last_p:]
    if range_candles:
        lowest_val = min(c.low for c in range_candles)
        lowest_idx = last_p + [c.low for c in range_candles].index(lowest_val)

        p_high = candles[last_p].high
        if p_high > 0:
            depth = (p_high - lowest_val) / p_high
            depths.append(depth)
            pivot_highs.append(p_high)
            trough_lows.append(lowest_val)
            trough_indices.append(lowest_idx)

    # We need at least 2 pullback depths to check for contraction
    if len(depths) < 2:
        return None

    # Check contraction condition (last 2 or 3 depths must be decreasing)
    # e.g., D_1 > D_2 > D_3
    # We will check the last N depths
    n_depths = min(3, len(depths))
    active_depths = depths[-n_depths:]

    is_contracting = True
    for i in range(1, len(active_depths)):
        if active_depths[i - 1] <= active_depths[i]:
            is_contracting = False
            break

    if not is_contracting:
        return None

    # The final contraction must be tight
    final_depth = active_depths[-1]
    if final_depth > max_final_depth:
        return None

    # Volume filter: during the last tight area (from the last trough to now),
    # the average volume must be below the vol_ratio * 50-day average volume.
    last_trough_idx = trough_indices[-1]
    tight_candles = candles[last_trough_idx:]
    if not tight_candles:
        return None
    avg_tight_vol = sum(c.volume for c in tight_candles) / len(tight_candles)

    # 50-day average volume
    if len(candles) < 50:
        return None
    vol_50 = sum(c.volume for c in candles[-50:]) / 50.0
    if vol_50 <= 0 or avg_tight_vol > vol_ratio * vol_50:
        return None

    # Trigger breakout or near-breakout check
    # Price is within 5% of the last pivot high, or has crossed above it
    latest_close = candles[-1].close
    last_pivot_high = candles[peaks[-1]].high
    if latest_close < last_pivot_high * 0.95:
        return None  # Still too far below the pivot

    # Stop loss placement: just below the low of the tight area
    tight_low = min(c.low for c in tight_candles)

    # Depth percentages for reporting
    depths_str = ", ".join(f"{d * 100:.1f}%" for d in active_depths)

    return RuleHit(
        rule_id="vcp_contraction",
        severity="p2",
        detail=f"VCP setup: depths [{depths_str}] contracting (tight depth {final_depth * 100:.1f}%), volume contracted to {(avg_tight_vol / vol_50) * 100:.1f}%",
        metrics={
            "price": latest_close,
            "pivot_high": round(last_pivot_high, 4),
            "tight_low": round(tight_low, 4),
            "final_depth": round(final_depth, 4),
        },
    )
