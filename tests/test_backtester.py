from datetime import datetime, timedelta, timezone

from packages.backtester.engine import aggregate, backtest_rule
from packages.scanner.rules.long_green_candle import long_green_candle
from packages.shared.types import Candle


def test_aggregate_empty():
    r = aggregate([])
    assert r.sample_triggers == 0
    assert r.win_rate == 0.0


def test_aggregate_basic():
    r = aggregate([0.10, -0.05, 0.02, 0.04])
    assert r.sample_triggers == 4
    assert r.win_rate == 0.75  # 3 of 4 positive
    assert r.false_positive_rate == 0.25
    assert r.avg_return == round((0.10 - 0.05 + 0.02 + 0.04) / 4, 4)


def _series(prices: list[float]) -> list[Candle]:
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    out = []
    prev = prices[0]
    for i, p in enumerate(prices):
        out.append(Candle(ts=base + timedelta(days=i), open=prev, high=max(prev, p), low=min(prev, p), close=p, volume=100.0))
        prev = p
    return out


def test_backtest_rule_runs():
    # A long green candle on bar 1 (100->110), then price rises further -> win
    candles = _series([100, 110, 112, 114, 116, 118, 120])
    res = backtest_rule(long_green_candle, candles, forward_bars=3, params={"min_body_pct": 0.03})
    assert res.sample_triggers >= 1
    assert 0.0 <= res.win_rate <= 1.0
