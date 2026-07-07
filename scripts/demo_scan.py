"""End-to-end Phase 1 demo:

  fetch candles (Binance) -> run scanner -> score -> persist Signal -> notify

Run from repo root:  python scripts/demo_scan.py

Works with zero credentials: if a channel's env vars are unset that channel's
send() is a no-op but the signal is still scored and stored.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import Session, select  # noqa: E402

from apps.api.db import engine, init_db  # noqa: E402
from apps.api.models import Rule, Severity, Signal, Symbol, WatchedSymbol  # noqa: E402
from apps.api.services.seed import seed_all  # noqa: E402
from packages.data.crypto.binance import fetch_klines, fetch_funding_rate  # noqa: E402
from packages.data.equity.yahoo import fetch_candles  # noqa: E402
from packages.notifier import dispatch  # noqa: E402
from packages.scanner.deduper import dedup_key  # noqa: E402
from packages.scanner.engine import scan_symbol  # noqa: E402


def run() -> None:
    init_db()
    with Session(engine) as session:
        seed_all(session)

        # Globally disabled rules (e.g. pruned by backtest) are excluded from
        # every scan, regardless of a symbol's enabled_rules list.
        disabled = {r.id for r in session.exec(select(Rule)).all() if not r.enabled}

        watched = session.exec(select(WatchedSymbol)).all()
        for w in watched:
            sym = session.get(Symbol, w.symbol_id)

            print(f"Scanning {sym.ticker} ({sym.asset_type.value})...")
            try:
                # Fetch long history so long-term rules (e.g. 200-week MA,
                # 52-week breakout) have enough lookback.
                if sym.asset_type.value == "crypto":
                    candles = fetch_klines(sym.ticker, interval="1d", limit=1000)
                else:  # equity via Yahoo Finance
                    candles = fetch_candles(sym.ticker, rng="5y", interval="1d")
            except Exception as exc:
                print(f"  ! data fetch failed: {exc}")
                continue

            # Funding rate only exists for crypto perpetuals; best-effort since
            # not every symbol has a perpetual contract (e.g. spot-only pairs).
            funding_rates = None
            if sym.asset_type.value == "crypto":
                try:
                    funding_rates = fetch_funding_rate(sym.ticker, limit=100)
                except Exception as exc:
                    print(f"  ! funding rate fetch skipped: {exc}")

            active_rules = [r for r in (w.enabled_rules or []) if r not in disabled]
            result = scan_symbol(
                sym.ticker,
                sym.asset_type.value,
                candles,
                enabled_rules=active_rules or None,
                params_overrides={"volume_spike_2x": {"multiplier": w.volume_multiplier}},
                p1_min_score=w.p1_score_threshold,
                funding_rates=funding_rates,
            )

            if not result.hits:
                print("  no hits")
                continue

            detail = "; ".join(h.detail for h in result.hits)
            key = dedup_key(sym.ticker, [h.rule_id for h in result.hits])
            if session.exec(select(Signal).where(Signal.dedup_key == key)).first():
                print("  deduped (already signalled this hour)")
                continue

            primary = result.hits[0]
            signal = Signal(
                symbol_id=sym.id,
                rule_id=primary.rule_id,
                severity=Severity(result.score.severity),
                score=result.score.score,
                score_components=result.score.components,
                price_at_trigger=primary.metrics.get("price", 0.0),
                volume_multiplier=primary.metrics.get("volume_multiplier", 0.0),
                # Keep the human-readable "why" (e.g. "Closed above upper Bollinger
                # band (312.08)") alongside raw metrics so the UI can show exactly
                # which rule fired and why, not just its category.
                extra={h.rule_id: {"detail": h.detail, "metrics": h.metrics} for h in result.hits},
                dedup_key=key,
            )
            session.add(signal)
            session.commit()
            session.refresh(signal)

            # Only P1/P2 push to notification channels; observe-level is recorded only (§5).
            if result.score.severity in ("p1", "p2"):
                sent = dispatch.dispatch(
                    w.channels, sym.ticker, result.score.severity, result.score.score, detail
                )
                signal.notified_channels = [ch for ch, ok in sent.items() if ok]
                if signal.notified_channels:
                    signal.notified_at = signal.triggered_at
                    session.add(signal)
                    session.commit()
                pushed = ", ".join(f"{ch}={'sent' if ok else 'skipped'}" for ch, ok in sent.items()) or "no channels"
            else:
                pushed = "not pushed (observe)"
            print(f"  SIGNAL #{signal.id} [{result.score.severity}] score={result.score.score} {pushed}")
            print(f"    {detail}")


if __name__ == "__main__":
    run()
