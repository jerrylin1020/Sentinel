"""Seed the DB with the rule library (from the scanner registry) and a small
starter watchlist. Idempotent — safe to run on every startup."""

from __future__ import annotations

from sqlmodel import Session, select

from apps.api.models import AssetType, Rule, RuleCategory, Symbol, WatchedSymbol
from packages.scanner.rules.base import registry

_STARTER_SYMBOLS = [
    ("NVDA", "NVIDIA Corp", AssetType.equity, "NASDAQ"),
    ("AAPL", "Apple Inc", AssetType.equity, "NASDAQ"),
    ("BTCUSDT", "Bitcoin", AssetType.crypto, "BINANCE"),
    ("ETHUSDT", "Ethereum", AssetType.crypto, "BINANCE"),
]


def seed_rules(session: Session) -> None:
    for spec in registry.values():
        existing = session.get(Rule, spec.id)
        if existing:
            # Keep descriptive metadata in sync (e.g. renames); never touch
            # user-tunable fields (weight / params / enabled).
            existing.name = spec.name
            existing.description = spec.description
            existing.category = RuleCategory(spec.category)
            existing.applies_to = list(spec.applies_to)
            existing.timeframe = spec.timeframe
            existing.data_source = spec.data_source
            session.add(existing)
            continue
        session.add(
            Rule(
                id=spec.id,
                name=spec.name,
                category=RuleCategory(spec.category),
                description=spec.description,
                applies_to=list(spec.applies_to),
                weight=spec.weight,
                timeframe=spec.timeframe,
                data_source=spec.data_source,
                params=dict(spec.default_params),
                enabled=True,
            )
        )
    session.commit()


def seed_watchlist(session: Session) -> None:
    for ticker, name, asset_type, exchange in _STARTER_SYMBOLS:
        existing = session.exec(select(Symbol).where(Symbol.ticker == ticker)).first()
        if existing:
            continue
        sym = Symbol(ticker=ticker, name=name, asset_type=asset_type, exchange=exchange)
        session.add(sym)
        session.commit()
        session.refresh(sym)
        session.add(
            WatchedSymbol(
                symbol_id=sym.id,
                enabled_rules=list(registry.keys()),
                channels=["telegram"],
            )
        )
    session.commit()

    # Backfill: make sure existing watched symbols pick up newly added rules
    # (union only — never removes a rule the user may have toggled off later).
    all_rule_ids = set(registry.keys())
    for w in session.exec(select(WatchedSymbol)).all():
        current = set(w.enabled_rules or [])
        missing = all_rule_ids - current
        if missing:
            w.enabled_rules = sorted(current | all_rule_ids)
            session.add(w)
    session.commit()


def seed_all(session: Session) -> None:
    seed_rules(session)
    seed_watchlist(session)
