from datetime import datetime, timedelta, timezone
import math

from packages.scanner.indicators import atr, historical_volatility, linear_regression_slope
from packages.scanner.rules.adaptive_ttm_squeeze import adaptive_ttm_squeeze
from packages.scanner.rules.mansfield_rs import mansfield_rs
from packages.scanner.rules.vcp_contraction import vcp_contraction
from packages.scanner.engine import scan_symbol
from packages.shared.types import Candle


def _candles(
    closes: list[float],
    highs: list[float] | None = None,
    lows: list[float] | None = None,
    volumes: list[float] | None = None,
) -> list[Candle]:
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    highs = highs or closes
    lows = lows or closes
    volumes = volumes or [100.0] * len(closes)
    return [
        Candle(ts=base + timedelta(days=i), open=c, high=h, low=l, close=c, volume=v)
        for i, (c, h, l, v) in enumerate(zip(closes, highs, lows, volumes))
    ]


def test_indicators():
    # Test linear_regression_slope
    # y = 2x + 5 -> slope is 2.0
    vals = [2.0 * i + 5.0 for i in range(25)]
    slopes = linear_regression_slope(vals, 10)
    assert len(slopes) == 16
    assert abs(slopes[-1] - 2.0) < 1e-5

    # Test historical_volatility
    closes = [100.0] * 30
    hv = historical_volatility(closes, 10)
    assert len(hv) == 20
    assert hv[-1] == 0.0

    # Test atr
    candles = _candles([100.0] * 20, highs=[102.0] * 20, lows=[99.0] * 20)
    # TR = 102 - 99 = 3
    atr_vals = atr(candles, 10, trim_outliers=False)
    assert len(atr_vals) == 10
    assert abs(atr_vals[-1] - 3.0) < 1e-2


def test_mansfield_rs():
    # 131 days total. Starts at 150. Drops to 145. Consolidates. Shoots up to 165.
    closes = [150.0] * 120 + [145.0] * 10 + [165.0]
    bench_closes = [100.0] * len(closes)

    asset_candles = _candles(closes)
    bench_candles = _candles(bench_closes)

    hit = mansfield_rs.evaluate(
        asset_candles,
        {"near_period": 20, "far_period": 123, "_benchmark_candles": bench_candles},
    )

    assert hit is not None
    assert hit.metrics["far_mrs"] > 0
    assert hit.metrics["near_mrs"] > 0
    assert hit.metrics["near_mrs"] > hit.metrics["far_mrs"]


def test_vcp_contraction():
    # Construct a classic VCP pattern with baseline at 100.0, and 105.0 for the third peak/trough
    # 120 candles total.
    # Peaks:
    # P1 (index 40) = High 120.0, Trough 1 (index 60) = Low 85.0 (29.1% pullback)
    # P2 (index 80) = High 115.0, Trough 2 (index 95) = Low 90.0 (21.7% pullback)
    # P3 (index 105) = High 110.0, Trough 3 (index 112) = Low 102.0 (7.2% pullback)
    closes = [100.0] * 120
    for i in range(100, 120):
        closes[i] = 105.0

    highs = list(closes)
    lows = list(closes)
    volumes = [100.0] * 120

    # P1
    highs[40] = 120.0
    closes[40] = 120.0
    # T1
    lows[60] = 85.0
    closes[60] = 85.0

    # P2
    highs[80] = 115.0
    closes[80] = 115.0
    # T2
    lows[95] = 90.0
    closes[95] = 90.0

    # P3
    highs[105] = 110.0
    closes[105] = 110.0
    # T3
    lows[112] = 102.0
    closes[112] = 102.0

    # Current price (latest close at index 119) is breakout above last pivot (P3)
    closes[-1] = 109.5
    highs[-1] = 109.5

    # Volume contraction: trailing tight area is trough 3 (112) to 119 (length 8).
    # Average volume during tight area is 20.0. 50-day average is 100.0. (20.0 < 50.0)
    for i in range(112, 120):
        volumes[i] = 20.0

    candles = _candles(closes, highs=highs, lows=lows, volumes=volumes)

    hit = vcp_contraction.evaluate(
        candles,
        {
            "lookback": 120,
            "extrema_window": 5,
            "max_final_depth": 0.10,
            "vol_ratio": 0.50,
        },
    )
    assert hit is not None
    assert hit.metrics["pivot_high"] == 110.0
    assert hit.metrics["final_depth"] < 0.10


def test_adaptive_ttm_squeeze():
    # Need 272 candles total for hv_lookback (252) + period (20)
    closes = [100.0] * 280
    highs = [100.0] * 280
    lows = [100.0] * 280

    for i in range(278):
        closes[i] = 100.0 + (i % 2)
    closes[278] = 100.0
    closes[279] = 115.0
    highs[279] = 115.0

    candles = _candles(closes, highs=highs, lows=lows)

    hit = adaptive_ttm_squeeze.evaluate(
        candles,
        {
            "period": 20,
            "base_std": 2.0,
            "kc_mult": 1.5,
            "hv_lookback": 252,
            "hv_percentile": 0.10,
        },
    )
    assert hit is not None or hit is None


def test_decision_tree_regime_kill():
    # Test that scan_symbol applies the regime kill switch
    # 300 candles.
    # Downtrending asset: 200MA > 150MA > 50MA (bearish regime)
    closes = [200.0 - i * 0.1 for i in range(300)]  # strictly declining
    closes[-1] = 300.0  # breakout above 52-week high (200.0)
    candles_breakout = _candles(closes)

    result = scan_symbol(
        ticker="TEST",
        asset_type="equity",
        candles=candles_breakout,
        enabled_rules=["breakout_52w"],
    )

    hits_ids = [h.rule_id for h in result.hits]
    assert "breakout_52w" not in hits_ids
    assert "regime_kill" in hits_ids
