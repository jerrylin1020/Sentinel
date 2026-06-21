from datetime import datetime, timezone

from packages.scanner.rules.long_green_candle import long_green_candle
from packages.shared.types import Candle


def _candle(open_: float, close: float) -> Candle:
    ts = datetime(2026, 1, 1, tzinfo=timezone.utc)
    hi = max(open_, close)
    lo = min(open_, close)
    return Candle(ts=ts, open=open_, high=hi, low=lo, close=close, volume=100.0)


def test_fires_on_long_green():
    hit = long_green_candle.evaluate([_candle(100.0, 105.0)], {"min_body_pct": 0.03})  # +5%
    assert hit is not None
    assert hit.metrics["body_pct"] == 0.05


def test_no_fire_on_small_body():
    assert long_green_candle.evaluate([_candle(100.0, 101.0)], {"min_body_pct": 0.03}) is None  # +1%


def test_no_fire_on_red_candle():
    assert long_green_candle.evaluate([_candle(105.0, 100.0)], {"min_body_pct": 0.03}) is None


def test_empty_candles():
    assert long_green_candle.evaluate([], {"min_body_pct": 0.03}) is None
