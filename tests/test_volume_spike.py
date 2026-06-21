from datetime import datetime, timedelta, timezone

from packages.scanner.engine import scan_symbol
from packages.scanner.rules.volume_spike import volume_spike
from packages.shared.types import Candle


def _candles(volumes: list[float], close: float = 100.0) -> list[Candle]:
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return [
        Candle(ts=base + timedelta(days=i), open=close, high=close, low=close, close=close, volume=v)
        for i, v in enumerate(volumes)
    ]


def test_fires_on_spike():
    candles = _candles([100.0] * 20 + [300.0])  # last bar 3x avg
    hit = volume_spike.evaluate(candles, {"multiplier": 2.0, "lookback": 20, "min_price": 0.0})
    assert hit is not None
    assert hit.metrics["volume_multiplier"] == 3.0


def test_no_fire_below_multiplier():
    candles = _candles([100.0] * 20 + [150.0])  # only 1.5x
    hit = volume_spike.evaluate(candles, {"multiplier": 2.0, "lookback": 20, "min_price": 0.0})
    assert hit is None


def test_data_quality_guard_zero_volume():
    candles = _candles([100.0] * 20 + [0.0])
    assert volume_spike.evaluate(candles, {"multiplier": 2.0, "lookback": 20}) is None


def test_insufficient_history():
    candles = _candles([100.0] * 5)
    assert volume_spike.evaluate(candles, {"multiplier": 2.0, "lookback": 20}) is None


def test_engine_skips_non_applicable_asset():
    candles = _candles([100.0] * 20 + [300.0])
    result = scan_symbol("XYZ", "forex", candles)  # no rule applies to forex
    assert result.hits == []
    assert result.score.severity == "observe"
