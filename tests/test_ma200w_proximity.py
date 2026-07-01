from datetime import datetime, timedelta, timezone

from packages.scanner.rules.ma200w_proximity import ma200w_proximity
from packages.shared.types import Candle


def _series(closes: list[float]) -> list[Candle]:
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return [
        Candle(ts=base + timedelta(days=i), open=c, high=c, low=c, close=c, volume=100.0)
        for i, c in enumerate(closes)
    ]


def test_fires_when_near_ma():
    closes = [100.0] * 50 + [101.5]  # MA ~100, price within 1.5%
    hit = ma200w_proximity.evaluate(_series(closes), {"period": 50, "proximity_pct": 0.03})
    assert hit is not None
    assert hit.metrics["distance"] <= 0.03


def test_no_fire_when_far():
    closes = [100.0] * 50 + [130.0]  # 30% away
    assert ma200w_proximity.evaluate(_series(closes), {"period": 50, "proximity_pct": 0.03}) is None


def test_insufficient_history():
    closes = [100.0] * 10
    assert ma200w_proximity.evaluate(_series(closes), {"period": 1000, "proximity_pct": 0.03}) is None
