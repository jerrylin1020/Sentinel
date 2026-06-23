"""Rule backtester (handoff core principle: "回測驅動").

For a rule, walk historical candles bar-by-bar. Whenever the rule would have
fired, record the forward return over `forward_bars`. Aggregate into win rate,
average return, false-positive rate and a crude Sharpe.

A "win" = forward return strictly positive (the rule predicted an up move).
This is intentionally simple — it gives a comparable score across rules, not a
trading-grade P&L.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean, pstdev

from packages.scanner.rules.base import RuleSpec
from packages.shared.types import Candle


@dataclass
class BacktestResult:
    sample_triggers: int
    win_rate: float
    avg_return: float
    false_positive_rate: float
    sharpe: float

    @classmethod
    def empty(cls) -> "BacktestResult":
        return cls(0, 0.0, 0.0, 0.0, 0.0)


def _forward_returns(
    spec: RuleSpec, candles: list[Candle], params: dict, forward_bars: int
) -> list[float]:
    """Return the forward return for every bar where the rule fired."""
    returns: list[float] = []
    # Need at least one bar of history to evaluate, and forward_bars ahead to score.
    for t in range(1, len(candles) - forward_bars):
        window = candles[: t + 1]
        if spec.evaluate(window, params) is None:
            continue
        entry = candles[t].close
        exit_ = candles[t + forward_bars].close
        if entry > 0:
            returns.append((exit_ - entry) / entry)
    return returns


def backtest_rule(
    spec: RuleSpec,
    candles: list[Candle],
    *,
    forward_bars: int = 5,
    params: dict | None = None,
) -> BacktestResult:
    returns = _forward_returns(spec, candles, params or {}, forward_bars)
    return aggregate(returns)


def aggregate(returns: list[float]) -> BacktestResult:
    """Aggregate a flat list of forward returns into stats."""
    n = len(returns)
    if n == 0:
        return BacktestResult.empty()

    wins = sum(1 for r in returns if r > 0)
    win_rate = wins / n
    avg_return = mean(returns)
    std = pstdev(returns) if n > 1 else 0.0
    sharpe = (avg_return / std) if std > 0 else 0.0
    return BacktestResult(
        sample_triggers=n,
        win_rate=round(win_rate, 4),
        avg_return=round(avg_return, 4),
        false_positive_rate=round(1 - win_rate, 4),
        sharpe=round(sharpe, 4),
    )
