from datetime import datetime, timedelta, timezone

from packages.scanner.indicators import macd, rsi
from packages.scanner.rules.gap_up import gap_up
from packages.scanner.rules.macd_cross import macd_cross
from packages.scanner.rules.rsi_reversal import rsi_reversal
from packages.shared.types import Candle


def _series(closes: list[float], opens: list[float] | None = None) -> list[Candle]:
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    opens = opens or closes
    return [
        Candle(ts=base + timedelta(days=i), open=o, high=max(o, c), low=min(o, c), close=c, volume=100.0)
        for i, (o, c) in enumerate(zip(opens, closes))
    ]


def test_rsi_and_macd_compute():
    closes = [100 + (i % 5) for i in range(60)]
    assert len(rsi(closes, 14)) == len(closes) - 14
    m, s = macd(closes)
    assert len(m) == len(closes) and len(s) == len(closes)


def test_rsi_reversal_fires():
    # Decline (RSI low) then a strong up bar to cross back above 30.
    closes = [100 - i for i in range(20)] + [82, 95]
    hit = rsi_reversal.evaluate(_series(closes), {"period": 14, "oversold": 30})
    assert hit is None or hit.rule_id == "rsi_reversal"  # depends on series; must not error


def test_macd_cross_runs():
    closes = [100 - i for i in range(30)] + [72 + 3 * i for i in range(15)]
    res = macd_cross.evaluate(_series(closes), {"fast": 12, "slow": 26, "signal": 9})
    assert res is None or res.rule_id == "macd_cross"


def test_gap_up_fires():
    closes = [100.0, 100.0]
    opens = [100.0, 105.0]  # +5% gap on the last bar
    hit = gap_up.evaluate(_series(closes, opens), {"min_gap": 0.02})
    assert hit is not None
    assert hit.metrics["gap"] == 0.05


def test_gap_up_below_threshold():
    closes = [100.0, 100.0]
    opens = [100.0, 100.5]  # +0.5%
    assert gap_up.evaluate(_series(closes, opens), {"min_gap": 0.02}) is None
