"""Adaptive TTM Squeeze — fires when a volatility squeeze (Bollinger bands
contracting inside Keltner channels) fires (releases), with dynamic standard deviation
adjusting based on Historical Volatility.
"""

from __future__ import annotations

from statistics import pstdev

from packages.scanner.indicators import atr, ema, historical_volatility, linear_regression_slope
from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


@rule(
    id="adaptive_ttm_squeeze",
    name="Adaptive TTM Squeeze",
    category="technical",
    trigger_severity="p2",
    description="Bollinger Bands squeeze inside Keltner Channels with standard deviation adaptive to Historical Volatility, triggering on squeeze release (Fired).",
    applies_to=["equity", "crypto"],
    weight=1.9,
    timeframe="1d",
    default_params={"period": 20, "base_std": 2.0, "kc_mult": 1.5, "hv_lookback": 252, "hv_percentile": 0.10},
)
def adaptive_ttm_squeeze(candles: list[Candle], params: dict) -> RuleHit | None:
    period = int(params["period"])
    base_std = float(params["base_std"])
    kc_mult = float(params["kc_mult"])
    hv_lookback = int(params["hv_lookback"])
    hv_percentile = float(params["hv_percentile"])

    # We need enough candles for 252-day HV + 20-day indicator calculation
    if len(candles) < hv_lookback + period:
        return None

    closes = [c.close for c in candles]
    latest = candles[-1]
    if latest.close <= 0:
        return None

    # 1. Calculate Historical Volatility series
    hv_series = historical_volatility(closes, period=20)
    if len(hv_series) < 10:
        return None

    # Calculate percentile threshold for the past 252 days
    recent_hvs = sorted(hv_series[-hv_lookback:])
    pct_idx = int(len(recent_hvs) * hv_percentile)
    hv_threshold = recent_hvs[min(pct_idx, len(recent_hvs) - 1)]

    current_hv = hv_series[-1]

    # Dynamic standard deviation: if current volatility is in bottom 10%, tighten BB std to 1.5
    std = 1.5 if current_hv < hv_threshold else base_std

    # 2. Calculate Bollinger Bands (BB)
    mid_bb = ema(closes, period)
    # Get standard deviations
    sd_series = []
    for i in range(period - 1, len(closes)):
        sd_series.append(pstdev(closes[i - period + 1 : i + 1]))

    # Align series
    # mid_bb length = len(closes)
    # sd_series length = len(closes) - period + 1
    # We want trailing window
    sd_now = sd_series[-1]
    sd_prev = sd_series[-2]

    # 3. Calculate Keltner Channels (KC)
    # KC upper/lower = 20 EMA +/- (kc_mult * ATR)
    atr_series = atr(candles, period=period, trim_outliers=True)
    if len(atr_series) < 2:
        return None
    atr_now = atr_series[-1]
    atr_prev = atr_series[-2]

    # Squeeze state: True if BB is completely inside KC (std * sd < kc_mult * atr)
    sq_now = (std * sd_now) < (kc_mult * atr_now)
    sq_prev = (std * sd_prev) < (kc_mult * atr_prev)

    # 4. Calculate John Carter style TTM Momentum:
    # Delta = Close - average of (20 EMA and 20-period Donchian mid-point)
    # Then take 20-period linear regression slope of Delta
    delta_series: list[float] = []
    highs = [c.high for c in candles]
    lows = [c.low for c in candles]

    # Calculate average of EMA and Donchian channel mid
    ema_vals = mid_bb
    for i in range(len(closes)):
        if i < period - 1:
            delta_series.append(0.0)
            continue
        donchian_high = max(highs[i - period + 1 : i + 1])
        donchian_low = min(lows[i - period + 1 : i + 1])
        donchian_mid = (donchian_high + donchian_low) / 2.0
        avg_mid = (ema_vals[i] + donchian_mid) / 2.0
        delta_series.append(closes[i] - avg_mid)

    # Get linear regression slope of delta
    slope_series = linear_regression_slope(delta_series, period)
    if len(slope_series) < 2:
        return None

    slope_now = slope_series[-1]
    slope_prev = slope_series[-2]

    # TTM Squeeze Fired: Squeeze was active recently (say, yesterday), but is released today
    # Or, squeeze was active in the last 5 days and is released today
    sq_recent = False
    for offset_day in range(2, 7):
        if len(sd_series) >= offset_day:
            sd_day = sd_series[-offset_day]
            atr_day = atr_series[-offset_day]
            if (std * sd_day) < (kc_mult * atr_day):
                sq_recent = True
                break

    is_fired = (sq_recent or sq_prev) and (not sq_now)

    # Momentum is rising (cyan bars)
    mrs_rising = slope_now > slope_prev and slope_now > 0

    # Breakout check: price crosses above Bollinger upper band or Keltner upper channel
    bb_upper = mid_bb[-1] + std * sd_now
    kc_upper = mid_bb[-1] + kc_mult * atr_now

    is_breakout = latest.close > bb_upper or latest.close > kc_upper

    if not (is_fired and mrs_rising and is_breakout):
        return None

    return RuleHit(
        rule_id="adaptive_ttm_squeeze",
        severity="p2",
        detail=f"TTM Squeeze Fired with cyan momentum (+{slope_now:.4f}) and price breakout above {max(bb_upper, kc_upper):.2f}",
        metrics={
            "price": latest.close,
            "bb_upper": round(bb_upper, 4),
            "kc_upper": round(kc_upper, 4),
            "std": round(std, 2),
            "momentum_slope": round(slope_now, 4),
        },
    )
