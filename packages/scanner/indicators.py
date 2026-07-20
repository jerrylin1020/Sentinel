"""Small, dependency-free technical indicators over close-price lists."""

from __future__ import annotations

import math
from statistics import median, pstdev

from packages.shared.types import Candle


def ema(values: list[float], period: int) -> list[float]:
    if not values:
        return []
    k = 2 / (period + 1)
    out = [values[0]]
    for v in values[1:]:
        out.append(v * k + out[-1] * (1 - k))
    return out


def rsi(closes: list[float], period: int = 14) -> list[float]:
    """Return the RSI series; length = len(closes) - period (aligned to the end)."""
    if len(closes) < period + 1:
        return []
    gains, losses = [], []
    for i in range(1, len(closes)):
        ch = closes[i] - closes[i - 1]
        gains.append(max(ch, 0.0))
        losses.append(max(-ch, 0.0))

    out: list[float] = []
    for i in range(period - 1, len(gains)):
        avg_gain = sum(gains[i - period + 1 : i + 1]) / period
        avg_loss = sum(losses[i - period + 1 : i + 1]) / period
        if avg_loss == 0:
            out.append(100.0)
        else:
            rs = avg_gain / avg_loss
            out.append(100 - 100 / (1 + rs))
    return out


def macd(closes: list[float], fast: int = 12, slow: int = 26, signal: int = 9):
    """Return (macd_line, signal_line), both aligned to closes."""
    if len(closes) < slow:
        return [], []
    ema_fast = ema(closes, fast)
    ema_slow = ema(closes, slow)
    macd_line = [f - s for f, s in zip(ema_fast, ema_slow)]
    signal_line = ema(macd_line, signal)
    return macd_line, signal_line


def stochastic_k(highs: list[float], lows: list[float], closes: list[float], period: int = 14) -> list[float]:
    """Fast stochastic %K series: 100 * (close - lowest_low) / (highest_high - lowest_low),
    aligned to the end of `closes` (length = len(closes) - period + 1)."""
    n = len(closes)
    if n < period:
        return []
    out: list[float] = []
    for i in range(period - 1, n):
        window_high = max(highs[i - period + 1 : i + 1])
        window_low = min(lows[i - period + 1 : i + 1])
        span = window_high - window_low
        if span <= 0:
            out.append(50.0)
        else:
            out.append(100 * (closes[i] - window_low) / span)
    return out


def historical_volatility(closes: list[float], period: int = 20) -> list[float]:
    """Calculate annualized historical volatility over trailing `period`.
    Uses log returns. Aligned to the end of `closes` (length = len(closes) - period)."""
    n = len(closes)
    if n < period + 1:
        return []

    log_returns: list[float] = []
    for i in range(1, n):
        if closes[i - 1] > 0 and closes[i] > 0:
            log_returns.append(math.log(closes[i] / closes[i - 1]))
        else:
            log_returns.append(0.0)

    out: list[float] = []
    for i in range(period - 1, len(log_returns)):
        window = log_returns[i - period + 1 : i + 1]
        sd = pstdev(window)
        out.append(sd * math.sqrt(252))
    return out


def atr(candles: list[Candle], period: int = 14, trim_outliers: bool = True) -> list[float]:
    """Return the Average True Range (ATR) series, aligned to the end.
    Length = len(candles) - period.
    TR = max(high - low, |high - close_prev|, |low - close_prev|)."""
    n = len(candles)
    if n < period + 1:
        return []

    tr_list: list[float] = []
    for i in range(1, n):
        c = candles[i]
        prev = candles[i - 1]
        tr = max(
            c.high - c.low,
            abs(c.high - prev.close),
            abs(c.low - prev.close),
        )
        tr_list.append(tr)

    if trim_outliers and len(tr_list) > 20:
        med = median(tr_list)
        sd = pstdev(tr_list)
        cap = med + 2.5 * sd
        tr_list = [min(tr, cap) for tr in tr_list]

    out: list[float] = []
    current_atr = sum(tr_list[:period]) / period
    out.append(current_atr)

    alpha = 1.0 / period
    for tr in tr_list[period:]:
        current_atr = alpha * tr + (1 - alpha) * current_atr
        out.append(current_atr)
    return out


def linear_regression_slope(values: list[float], period: int = 20) -> list[float]:
    """Return the trailing linear regression slope of `values` over `period` window.
    Aligned to the end of `values` (length = len(values) - period + 1)."""
    n = len(values)
    if n < period:
        return []

    out: list[float] = []
    x = list(range(period))
    sum_x = sum(x)
    sum_x2 = sum(xi ** 2 for xi in x)
    denominator = period * sum_x2 - (sum_x ** 2)

    for i in range(period - 1, n):
        y = values[i - period + 1 : i + 1]
        sum_y = sum(y)
        sum_xy = sum(xi * yi for xi, yi in zip(x, y))
        numerator = period * sum_xy - sum_x * sum_y
        slope = numerator / denominator if denominator != 0 else 0.0
        out.append(slope)
    return out

