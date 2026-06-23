"""Backtest every rule over the watchlist's history and store win-rate stats.

Run from repo root:  python scripts/run_backtest.py
Designed to run weekly (handoff §11) to refresh each rule's win rate.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import Session, select  # noqa: E402

from apps.api.db import engine, init_db  # noqa: E402
from apps.api.models import Rule, RuleBacktestStats, Symbol, WatchedSymbol, utcnow  # noqa: E402
from apps.api.services.seed import seed_all  # noqa: E402
from packages.backtester.engine import aggregate  # noqa: E402
from packages.backtester.engine import _forward_returns  # noqa: E402
from packages.data.crypto.binance import fetch_klines  # noqa: E402
from packages.data.equity.yahoo import fetch_candles  # noqa: E402
from packages.scanner.rules.base import registry  # noqa: E402

FORWARD_BARS = 5


def _history(sym: Symbol):
    if sym.asset_type.value == "crypto":
        return fetch_klines(sym.ticker, interval="1d", limit=1000)
    return fetch_candles(sym.ticker, rng="5y", interval="1d")


def run() -> None:
    init_db()
    with Session(engine) as session:
        seed_all(session)
        symbols = session.exec(select(Symbol)).all()

        # Fetch history once per symbol (reused across all rules).
        history: dict[int, list] = {}
        for sym in symbols:
            try:
                history[sym.id] = _history(sym)
                print(f"fetched {sym.ticker}: {len(history[sym.id])} bars")
            except Exception as exc:
                print(f"  ! {sym.ticker} fetch failed: {exc}")

        for rule in session.exec(select(Rule)).all():
            spec = registry.get(rule.id)
            if spec is None:
                continue

            returns: list[float] = []
            bars_evaluated = 0
            for sym in symbols:
                candles = history.get(sym.id)
                if not candles or sym.asset_type.value not in spec.applies_to:
                    continue
                returns += _forward_returns(spec, candles, rule.params, FORWARD_BARS)
                bars_evaluated += max(0, len(candles) - FORWARD_BARS - 1)

            res = aggregate(returns)
            triggers_per_day = round(res.sample_triggers / bars_evaluated, 4) if bars_evaluated else 0.0

            stats = session.get(RuleBacktestStats, rule.id) or RuleBacktestStats(rule_id=rule.id)
            stats.period = "daily/5y"
            stats.win_rate = res.win_rate
            stats.avg_return = res.avg_return
            stats.false_positive_rate = res.false_positive_rate
            stats.sharpe = res.sharpe
            stats.sample_triggers = res.sample_triggers
            stats.triggers_per_day = triggers_per_day
            stats.updated_at = utcnow()
            session.add(stats)
            print(
                f"{rule.id}: triggers={res.sample_triggers} win={res.win_rate:.0%} "
                f"avg={res.avg_return:+.2%} sharpe={res.sharpe}"
            )

        session.commit()
    print("Backtest complete.")


if __name__ == "__main__":
    run()
