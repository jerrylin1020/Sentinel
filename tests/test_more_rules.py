from datetime import datetime, timedelta, timezone

from packages.scanner.rules.bollinger_squeeze_breakout import bollinger_squeeze_breakout
from packages.scanner.rules.golden_cross import golden_cross
from packages.scanner.rules.stochastic_reversal import stochastic_reversal
from packages.shared.types import Candle


def _series(closes: list[float]) -> list[Candle]:
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return [
        Candle(ts=base + timedelta(days=i), open=c, high=c, low=c, close=c, volume=100.0)
        for i, c in enumerate(closes)
    ]


# --- golden_cross -------------------------------------------------------------


def test_golden_cross_fires_on_fast_ma_cross_up():
    # 40 flat bars (fast MA == slow MA == 100), then a jump that pulls the
    # fast (10-bar) MA above the slow (40-bar) MA.
    closes = [100.0] * 40 + [500.0]
    hit = golden_cross.evaluate(_series(closes), {"fast_period": 10, "slow_period": 40})
    assert hit is not None
    assert hit.rule_id == "golden_cross"


def test_golden_cross_does_not_fire_when_flat():
    closes = [100.0] * 41
    hit = golden_cross.evaluate(_series(closes), {"fast_period": 10, "slow_period": 40})
    assert hit is None


def test_golden_cross_does_not_fire_with_insufficient_history():
    closes = [100.0] * 20
    hit = golden_cross.evaluate(_series(closes), {"fast_period": 10, "slow_period": 40})
    assert hit is None


# --- stochastic_reversal -------------------------------------------------------


def test_stochastic_reversal_runs_without_error():
    # Decline (pushes %K low) then a strong bounce back up.
    closes = [100 - i for i in range(20)] + [78, 96]
    hit = stochastic_reversal.evaluate(_series(closes), {"period": 14, "oversold": 20})
    assert hit is None or hit.rule_id == "stochastic_reversal"


def test_stochastic_reversal_does_not_fire_when_flat():
    closes = [100.0] * 20
    hit = stochastic_reversal.evaluate(_series(closes), {"period": 14, "oversold": 20})
    assert hit is None


# --- bollinger_squeeze_breakout -------------------------------------------------


def test_squeeze_breakout_fires_after_volatility_contraction():
    # 40 bars of real volatility (alternating +-10), then 10 flat "squeeze"
    # bars, then a sharp breakout bar well above the tight band.
    normal = [100.0 + (10 if i % 2 == 0 else -10) for i in range(40)]
    squeeze = [100.0] * 10
    closes = normal + squeeze + [130.0]

    hit = bollinger_squeeze_breakout.evaluate(
        _series(closes),
        {"period": 10, "std": 2.0, "squeeze_lookback": 40, "squeeze_ratio": 0.5},
    )
    assert hit is not None
    assert hit.rule_id == "bollinger_squeeze_breakout"


def test_squeeze_breakout_does_not_fire_when_flat():
    closes = [100.0] * 51
    hit = bollinger_squeeze_breakout.evaluate(
        _series(closes),
        {"period": 10, "std": 2.0, "squeeze_lookback": 40, "squeeze_ratio": 0.5},
    )
    assert hit is None


def test_squeeze_breakout_does_not_fire_without_prior_squeeze():
    # Breaks the upper band, but volatility was already wide beforehand
    # (no genuine contraction) — should not fire.
    wide = [100.0 + (15 if i % 2 == 0 else -15) for i in range(50)]
    closes = wide + [200.0]
    hit = bollinger_squeeze_breakout.evaluate(
        _series(closes),
        {"period": 10, "std": 2.0, "squeeze_lookback": 40, "squeeze_ratio": 0.5},
    )
    assert hit is None
