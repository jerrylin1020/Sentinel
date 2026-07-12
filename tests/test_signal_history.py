from datetime import date, datetime, timezone

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from apps.api.models import AssetType, Rule, RuleCategory, Severity, Signal, Symbol
from apps.api.routers.signals import list_signals


def test_signal_date_filter_uses_taipei_calendar_days():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        symbol = Symbol(ticker="NVDA", name="NVIDIA", asset_type=AssetType.equity, exchange="NASDAQ")
        rule = Rule(id="volume_spike_2x", name="Volume Spike", category=RuleCategory.volume)
        session.add_all([symbol, rule])
        session.commit()
        session.refresh(symbol)
        session.add_all([
            Signal(symbol_id=symbol.id, rule_id=rule.id, severity=Severity.p2, dedup_key="new", triggered_at=datetime(2026, 7, 10, 4, tzinfo=timezone.utc)),
            Signal(symbol_id=symbol.id, rule_id=rule.id, severity=Severity.p2, dedup_key="old", triggered_at=datetime(2026, 7, 9, 4, tzinfo=timezone.utc)),
        ])
        session.commit()

        signals = list_signals(signal_date=date(2026, 7, 10), session=session)

        assert len(signals) == 1
        assert signals[0]["triggered_at"].date() == date(2026, 7, 10)
