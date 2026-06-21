from datetime import datetime, timedelta, timezone

from packages.scanner.rules.breakout_52w import breakout_52w
from packages.shared.types import Candle


def _candles(highs: list[float], closes: list[float]) -> list[Candle]:
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return [
        Candle(ts=base + timedelta(days=i), open=c, high=h, low=c, close=c, volume=100.0)
        for i, (h, c) in enumerate(zip(highs, closes))
    ]


def test_fires_on_new_high():
    highs = [100.0] * 252 + [110.0]
    closes = [99.0] * 252 + [110.0]  # last close breaks above prior high 100
    hit = breakout_52w.evaluate(_candles(highs, closes), {"lookback": 252})
    assert hit is not None
    assert hit.metrics["prior_high"] == 100.0


def test_no_fire_when_below_prior_high():
    highs = [100.0] * 252 + [100.0]
    closes = [99.0] * 252 + [99.5]  # does not exceed prior high
    assert breakout_52w.evaluate(_candles(highs, closes), {"lookback": 252}) is None


def test_min_break_pct_gate():
    highs = [100.0] * 252 + [100.5]
    closes = [99.0] * 252 + [100.5]  # +0.5% break, but require 2%
    assert breakout_52w.evaluate(_candles(highs, closes), {"lookback": 252, "min_break_pct": 0.02}) is None


def test_insufficient_history():
    highs = [100.0] * 10
    closes = [100.0] * 10
    assert breakout_52w.evaluate(_candles(highs, closes), {"lookback": 252}) is None
