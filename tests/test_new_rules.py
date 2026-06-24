from datetime import datetime, timedelta, timezone

from packages.scanner.rules.bollinger_breakout import bollinger_breakout
from packages.scanner.rules.ma200_breakout import ma200_breakout
from packages.scanner.rules.price_momentum import price_momentum
from packages.shared.types import Candle


def _series(closes: list[float]) -> list[Candle]:
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return [
        Candle(ts=base + timedelta(days=i), open=c, high=c, low=c, close=c, volume=100.0)
        for i, c in enumerate(closes)
    ]


def test_ma200_cross_up():
    closes = [100.0] * 200 + [130.0]  # last bar jumps above the 200MA
    hit = ma200_breakout.evaluate(_series(closes), {"period": 200})
    assert hit is not None


def test_ma200_no_cross_when_already_above():
    closes = [100.0] * 200 + [101.0, 102.0]
    assert ma200_breakout.evaluate(_series(closes), {"period": 200}) is None


def test_bollinger_break_upper():
    closes = [100.0] * 20 + [120.0]  # spike above upper band
    hit = bollinger_breakout.evaluate(_series(closes), {"period": 20, "std": 2.0})
    assert hit is not None


def test_bollinger_no_break_flat():
    closes = [100.0] * 20 + [100.0]  # zero stddev -> no signal
    assert bollinger_breakout.evaluate(_series(closes), {"period": 20, "std": 2.0}) is None


def test_price_momentum_fires():
    closes = [100.0] * 5 + [100, 100, 100, 100, 100, 115.0]  # +15% over 10 bars
    hit = price_momentum.evaluate(_series(closes), {"lookback": 10, "min_return": 0.10})
    assert hit is not None


def test_price_momentum_below_threshold():
    closes = [100.0] * 10 + [103.0]  # only +3%
    assert price_momentum.evaluate(_series(closes), {"lookback": 10, "min_return": 0.10}) is None
