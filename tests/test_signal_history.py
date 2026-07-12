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


def test_signal_history_can_filter_a_ticker_and_page_by_score():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        wld = Symbol(ticker="WLDUSDT", name="Worldcoin", asset_type=AssetType.crypto, exchange="BINANCE")
        other = Symbol(ticker="NVDA", name="NVIDIA", asset_type=AssetType.equity, exchange="NASDAQ")
        rule = Rule(id="volume_spike_2x", name="Volume Spike", category=RuleCategory.volume)
        session.add_all([wld, other, rule])
        session.commit()
        session.refresh(wld)
        session.refresh(other)
        session.add_all([
            Signal(symbol_id=wld.id, rule_id=rule.id, severity=Severity.p2, score=3.8, dedup_key="wld-high", triggered_at=datetime(2026, 7, 11, tzinfo=timezone.utc)),
            Signal(symbol_id=wld.id, rule_id=rule.id, severity=Severity.p2, score=0.8, dedup_key="wld-low", triggered_at=datetime(2026, 7, 12, tzinfo=timezone.utc)),
            Signal(symbol_id=other.id, rule_id=rule.id, severity=Severity.p2, score=9.0, dedup_key="nvda", triggered_at=datetime(2026, 7, 13, tzinfo=timezone.utc)),
        ])
        session.commit()

        first = list_signals(ticker="wldusdt", sort="score_desc", limit=1, session=session)
        second = list_signals(ticker="WLDUSDT", sort="score_desc", limit=1, offset=1, session=session)

        assert [(signal["ticker"], signal["score"]) for signal in first] == [("WLDUSDT", 3.8)]
        assert [(signal["ticker"], signal["score"]) for signal in second] == [("WLDUSDT", 0.8)]


def test_signal_history_collapses_only_consecutive_legacy_states():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        symbol = Symbol(ticker="WLDUSDT", name="Worldcoin", asset_type=AssetType.crypto, exchange="BINANCE")
        rule = Rule(id="long_green_candle", name="Long Green Candle", category=RuleCategory.technical)
        session.add_all([symbol, rule])
        session.commit()
        session.refresh(symbol)
        session.add_all([
            Signal(symbol_id=symbol.id, rule_id=rule.id, severity=Severity.observe, score=0.8, score_components={rule.id: 0.8}, dedup_key="newest", triggered_at=datetime(2026, 7, 13, 3, tzinfo=timezone.utc)),
            Signal(symbol_id=symbol.id, rule_id=rule.id, severity=Severity.observe, score=0.8, score_components={rule.id: 0.8}, dedup_key="same", triggered_at=datetime(2026, 7, 13, 2, tzinfo=timezone.utc)),
            Signal(symbol_id=symbol.id, rule_id=rule.id, severity=Severity.p2, score=1.5, score_components={rule.id: 1.5}, dedup_key="changed", triggered_at=datetime(2026, 7, 13, 1, tzinfo=timezone.utc)),
            Signal(symbol_id=symbol.id, rule_id=rule.id, severity=Severity.observe, score=0.8, score_components={rule.id: 0.8}, dedup_key="reappeared", triggered_at=datetime(2026, 7, 13, 0, tzinfo=timezone.utc)),
        ])
        session.commit()

        signals = list_signals(ticker="WLDUSDT", session=session)

        assert [(signal["severity"], signal["score"]) for signal in signals] == [
            ("observe", 0.8),
            ("p2", 1.5),
            ("observe", 0.8),
        ]
