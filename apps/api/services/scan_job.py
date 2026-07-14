"""Reusable "fetch -> scan -> score -> persist -> notify" job.

Extracted from scripts/demo_scan.py so the exact same logic can be triggered
two ways:
  1. GitHub Actions schedule (scripts/demo_scan.py), as a free-but-imprecise
     backup (GitHub only guarantees best-effort timing on `schedule` cron,
     often delayed well beyond the configured 5 minutes under load).
  2. An HTTP endpoint (apps.api.routers.cron) hit by an external, precise
     free cron service (e.g. cron-job.org) every 5 minutes — this is the
     primary mechanism.
"""

from __future__ import annotations

from uuid import uuid4

from sqlmodel import Session, select

from apps.api.db import engine, init_db
from apps.api.models import Rule, Severity, Signal, Symbol, WatchedSymbol, utcnow
from apps.api.services.seed import seed_all
from packages.data.crypto.binance import fetch_klines, fetch_funding_rate
from packages.data.equity.yahoo import fetch_candles
from packages.notifier import dispatch
from packages.scanner.deduper import dedup_key
from packages.scanner.engine import scan_symbol

CONTINUITY_ACTIVE_KEY = "_sentinel_continuity_active"
SCAN_ID_KEY = "_sentinel_scan_id"
CONTINUITY_FIRST_SEEN_AT_KEY = "_sentinel_continuity_first_seen_at"
CONTINUITY_SCAN_COUNT_KEY = "_sentinel_continuity_scan_count"


def run_scan() -> list[dict]:
    """Run one scan pass over the whole watchlist. Returns a per-symbol summary."""
    init_db()
    scan_id = str(uuid4())
    scanned_at = utcnow()
    summary: list[dict] = []

    with Session(engine) as session:
        seed_all(session)

        # Globally disabled rules (e.g. pruned by backtest) are excluded from
        # every scan, regardless of a symbol's enabled_rules list.
        configured_rules = session.exec(select(Rule)).all()
        disabled = {r.id for r in configured_rules if not r.enabled}
        rule_weights = {r.id: r.weight for r in configured_rules}

        watched = session.exec(select(WatchedSymbol)).all()
        for w in watched:
            sym = session.get(Symbol, w.symbol_id)
            entry: dict = {"ticker": sym.ticker, "scan_id": scan_id}

            try:
                # Fetch long history so long-term rules (e.g. 200-week MA,
                # 52-week breakout) have enough lookback.
                if sym.asset_type.value == "crypto":
                    candles = fetch_klines(sym.ticker, interval="1d", limit=1000)
                else:  # equity via Yahoo Finance
                    candles = fetch_candles(sym.ticker, rng="5y", interval="1d")
            except Exception as exc:
                entry["error"] = f"data fetch failed: {exc}"
                summary.append(entry)
                continue

            # Funding rate only exists for crypto perpetuals; best-effort since
            # not every symbol has a perpetual contract (e.g. spot-only pairs).
            funding_rates = None
            if sym.asset_type.value == "crypto":
                try:
                    funding_rates = fetch_funding_rate(sym.ticker, limit=100)
                except Exception:
                    pass

            active_rules = [r for r in (w.enabled_rules or []) if r not in disabled]
            result = scan_symbol(
                sym.ticker,
                sym.asset_type.value,
                candles,
                enabled_rules=active_rules or None,
                params_overrides={"volume_spike_2x": {"multiplier": w.volume_multiplier}},
                p1_min_score=w.p1_score_threshold,
                funding_rates=funding_rates,
                rule_weights=rule_weights,
            )

            latest = session.exec(
                select(Signal)
                .where(Signal.symbol_id == sym.id)
                .order_by(Signal.triggered_at.desc())
            ).first()

            if not result.hits:
                if latest and (latest.extra or {}).get(CONTINUITY_ACTIVE_KEY):
                    latest.extra = {**(latest.extra or {}), CONTINUITY_ACTIVE_KEY: False}
                    session.add(latest)
                    session.commit()
                entry["hits"] = 0
                summary.append(entry)
                continue

            detail = "; ".join(h.detail for h in result.hits)
            key = dedup_key(
                sym.ticker,
                [h.rule_id for h in result.hits],
                result.score.severity,
                result.score.score,
                result.score.components,
            )
            signal_extra = {
                h.rule_id: {
                    "detail": h.detail,
                    "metrics": h.metrics,
                    "trigger_severity": h.severity,
                    "weight": rule_weights.get(h.rule_id, 1.0),
                }
                for h in result.hits
            }
            signal_extra[CONTINUITY_ACTIVE_KEY] = True
            signal_extra[SCAN_ID_KEY] = scan_id
            primary = result.hits[0]

            if latest and latest.dedup_key == key and (latest.extra or {}).get(CONTINUITY_ACTIVE_KEY):
                previous_extra = latest.extra or {}
                signal_extra[CONTINUITY_FIRST_SEEN_AT_KEY] = previous_extra.get(
                    CONTINUITY_FIRST_SEEN_AT_KEY, latest.triggered_at.isoformat()
                )
                signal_extra[CONTINUITY_SCAN_COUNT_KEY] = int(
                    previous_extra.get(CONTINUITY_SCAN_COUNT_KEY, 1)
                ) + 1
                latest.triggered_at = scanned_at
                latest.score = result.score.score
                latest.score_components = result.score.components
                latest.price_at_trigger = primary.metrics.get("price", 0.0)
                latest.volume_multiplier = primary.metrics.get("volume_multiplier", 0.0)
                latest.extra = signal_extra
                session.add(latest)
                session.commit()
                entry.update({
                    "signal_id": latest.id,
                    "merged": True,
                    "severity": result.score.severity,
                    "score": result.score.score,
                    "detail": detail,
                })
                summary.append(entry)
                continue

            if latest and (latest.extra or {}).get(CONTINUITY_ACTIVE_KEY):
                latest.extra = {**(latest.extra or {}), CONTINUITY_ACTIVE_KEY: False}
                session.add(latest)

            signal = Signal(
                symbol_id=sym.id,
                rule_id=primary.rule_id,
                severity=Severity(result.score.severity),
                score=result.score.score,
                score_components=result.score.components,
                price_at_trigger=primary.metrics.get("price", 0.0),
                volume_multiplier=primary.metrics.get("volume_multiplier", 0.0),
                # Keep the human-readable "why" alongside raw metrics, while the
                # private continuity flag lets a reappearing signal start a new row.
                extra={
                    **signal_extra,
                    CONTINUITY_FIRST_SEEN_AT_KEY: scanned_at.isoformat(),
                    CONTINUITY_SCAN_COUNT_KEY: 1,
                },
                dedup_key=key,
                triggered_at=scanned_at,
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
                entry["notified"] = sent

            entry["signal_id"] = signal.id
            entry["severity"] = result.score.severity
            entry["score"] = result.score.score
            entry["detail"] = detail
            summary.append(entry)

    return summary
