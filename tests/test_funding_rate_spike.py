from datetime import datetime, timedelta, timezone

from packages.scanner.engine import scan_symbol
from packages.scanner.rules.funding_rate_spike import funding_rate_spike
from packages.shared.types import Candle, FundingRatePoint


def _funding_series(rates: list[float]) -> list[FundingRatePoint]:
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return [
        FundingRatePoint(ts=base + timedelta(hours=8 * i), rate=r)
        for i, r in enumerate(rates)
    ]


def _candles(n: int) -> list[Candle]:
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return [
        Candle(ts=base + timedelta(days=i), open=100.0, high=100.0, low=100.0, close=100.0, volume=100.0)
        for i in range(n)
    ]


# --- rule unit tests -----------------------------------------------------------


def test_fires_on_extreme_positive_funding_rate():
    series = _funding_series([0.0001, 0.0002, 0.0015])
    hit = funding_rate_spike.evaluate(series, {"threshold": 0.001})
    assert hit is not None
    assert hit.rule_id == "funding_rate_spike"
    assert "long" in hit.detail.lower()


def test_fires_on_extreme_negative_funding_rate():
    series = _funding_series([0.0001, -0.0002, -0.0013])
    hit = funding_rate_spike.evaluate(series, {"threshold": 0.001})
    assert hit is not None
    assert "short" in hit.detail.lower()


def test_no_fire_within_normal_range():
    series = _funding_series([0.0001, 0.0001, 0.0002])
    hit = funding_rate_spike.evaluate(series, {"threshold": 0.001})
    assert hit is None


def test_no_fire_on_empty_series():
    assert funding_rate_spike.evaluate([], {"threshold": 0.001}) is None


# --- engine routing --------------------------------------------------------------


def test_engine_routes_funding_rate_series_to_funding_rules():
    candles = _candles(5)
    funding_rates = _funding_series([0.0001, 0.0002, 0.002])
    result = scan_symbol(
        "BTCUSDT",
        "crypto",
        candles,
        enabled_rules=["funding_rate_spike"],
        funding_rates=funding_rates,
    )
    assert len(result.hits) == 1
    assert result.hits[0].rule_id == "funding_rate_spike"


def test_engine_skips_funding_rule_when_no_funding_data():
    candles = _candles(5)
    result = scan_symbol(
        "BTCUSDT",
        "crypto",
        candles,
        enabled_rules=["funding_rate_spike"],
        funding_rates=None,
    )
    assert result.hits == []


def test_engine_does_not_apply_funding_rule_to_equity():
    candles = _candles(5)
    result = scan_symbol(
        "AAPL",
        "equity",
        candles,
        enabled_rules=["funding_rate_spike"],
        funding_rates=_funding_series([0.002]),
    )
    assert result.hits == []
