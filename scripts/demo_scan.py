"""End-to-end Phase 1 demo:

  fetch candles (Binance) -> run scanner -> score -> persist Signal -> Telegram

Run from repo root:  python scripts/demo_scan.py

Works with zero credentials: if Telegram env vars are unset the notify step is
skipped but the signal is still scored and stored.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import Session, select  # noqa: E402

from apps.api.db import engine, init_db  # noqa: E402
from apps.api.models import Severity, Signal, Symbol, WatchedSymbol  # noqa: E402
from apps.api.services.seed import seed_all  # noqa: E402
from packages.data.crypto.binance import fetch_klines  # noqa: E402
from packages.notifier import telegram  # noqa: E402
from packages.scanner.deduper import dedup_key  # noqa: E402
from packages.scanner.engine import scan_symbol  # noqa: E402


def run() -> None:
    init_db()
    with Session(engine) as session:
        seed_all(session)

        watched = session.exec(select(WatchedSymbol)).all()
        for w in watched:
            sym = session.get(Symbol, w.symbol_id)
            if sym.asset_type.value != "crypto":
                continue  # demo only fetches crypto live data

            print(f"Scanning {sym.ticker}...")
            try:
                candles = fetch_klines(sym.ticker, interval="1d", limit=300)
            except Exception as exc:
                print(f"  ! data fetch failed: {exc}")
                continue

            result = scan_symbol(
                sym.ticker,
                sym.asset_type.value,
                candles,
                enabled_rules=w.enabled_rules or None,
                params_overrides={"volume_spike_2x": {"multiplier": w.volume_multiplier}},
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
                extra={h.rule_id: h.metrics for h in result.hits},
                dedup_key=key,
            )
            session.add(signal)
            session.commit()
            session.refresh(signal)

            msg = telegram.format_signal(sym.ticker, result.score.severity, result.score.score, detail)
            sent = telegram.send(msg)
            print(f"  SIGNAL #{signal.id} [{result.score.severity}] score={result.score.score} "
                  f"telegram={'sent' if sent else 'skipped (no creds)'}")
            print(f"    {detail}")


if __name__ == "__main__":
    run()
