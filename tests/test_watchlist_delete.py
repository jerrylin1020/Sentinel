from sqlalchemy import event
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from apps.api.models import AssetType, Rule, RuleCategory, Severity, Signal, Symbol, WatchedSymbol
from apps.api.routers.watchlist import remove_watched


def test_remove_watchlist_keeps_symbol_and_signal_history():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection, _):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        symbol = Symbol(ticker="NVDA", name="NVIDIA", asset_type=AssetType.equity, exchange="NASDAQ")
        rule = Rule(
            id="volume_spike_2x",
            name="Volume Spike",
            category=RuleCategory.volume,
            applies_to=["equity"],
        )
        session.add(symbol)
        session.add(rule)
        session.commit()
        session.refresh(symbol)

        watched = WatchedSymbol(symbol_id=symbol.id)
        signal = Signal(
            symbol_id=symbol.id,
            rule_id=rule.id,
            severity=Severity.p2,
            dedup_key="NVDA:volume_spike_2x",
        )
        session.add(watched)
        session.add(signal)
        session.commit()
        session.refresh(watched)
        session.refresh(signal)

        remove_watched(watched.id, session)

        assert session.get(WatchedSymbol, watched.id) is None
        assert session.get(Symbol, symbol.id) is not None
        assert session.get(Signal, signal.id) is not None
