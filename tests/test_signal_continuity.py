from datetime import datetime, timezone

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from apps.api.models import AssetType, Rule, RuleCategory, ScanRun, Signal, Symbol, WatchedSymbol
from apps.api.services import scan_job
from packages.scanner.engine import ScanResult
from packages.scanner.scorer import ScoreResult
from packages.shared.types import Candle, RuleHit


def test_continuous_signal_keeps_one_latest_row_and_reappearance_creates_another(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        symbol = Symbol(ticker="WLDUSDT", name="Worldcoin", asset_type=AssetType.crypto, exchange="BINANCE")
        rule = Rule(id="long_green_candle", name="Long Green Candle", category=RuleCategory.technical)
        session.add_all([symbol, rule])
        session.commit()
        session.refresh(symbol)
        session.add(WatchedSymbol(symbol_id=symbol.id, enabled_rules=[rule.id]))
        session.commit()

    hit_one = RuleHit("long_green_candle", "observe", "Long green candle (body +4.1%)", {"price": 0.41})
    hit_two = RuleHit("long_green_candle", "observe", "Long green candle (body +7.5%)", {"price": 0.427})
    results = iter([
        ScanResult("WLDUSDT", [hit_one], ScoreResult(0.8, "observe", {"long_green_candle": 0.8})),
        ScanResult("WLDUSDT", [hit_two], ScoreResult(0.8, "observe", {"long_green_candle": 0.8})),
        ScanResult("WLDUSDT", [], ScoreResult(0.0, "observe", {})),
        ScanResult("WLDUSDT", [hit_one], ScoreResult(0.8, "observe", {"long_green_candle": 0.8})),
    ])
    candle = Candle(datetime(2026, 7, 13, tzinfo=timezone.utc), 0.4, 0.43, 0.39, 0.41, 1.0)
    monkeypatch.setattr(scan_job, "engine", engine)
    monkeypatch.setattr(scan_job, "init_db", lambda: None)
    monkeypatch.setattr(scan_job, "seed_all", lambda session: None)
    monkeypatch.setattr(scan_job, "fetch_klines", lambda *args, **kwargs: [candle])
    monkeypatch.setattr(scan_job, "fetch_funding_rate", lambda *args, **kwargs: [])
    monkeypatch.setattr(scan_job, "scan_symbol", lambda *args, **kwargs: next(results))

    scan_job.run_scan()
    scan_job.run_scan()
    with Session(engine) as session:
        signals = session.exec(select(Signal)).all()
        scan_runs = session.exec(select(ScanRun).order_by(ScanRun.id)).all()
        assert len(signals) == 1
        assert len(scan_runs) == 2
        assert all(run.status == "succeeded" for run in scan_runs)
        assert scan_runs[-1].scanned_symbols == 1
        assert scan_runs[-1].matched_symbols == 1
        assert signals[0].price_at_trigger == 0.427
        assert "7.5%" in signals[0].extra["long_green_candle"]["detail"]
        assert signals[0].extra[scan_job.SCAN_ID_KEY]
        assert signals[0].extra[scan_job.CONTINUITY_SCAN_COUNT_KEY] == 2
        assert signals[0].extra[scan_job.CONTINUITY_FIRST_SEEN_AT_KEY]

    scan_job.run_scan()
    scan_job.run_scan()
    with Session(engine) as session:
        signals = session.exec(select(Signal)).all()
        scan_runs = session.exec(select(ScanRun).order_by(ScanRun.id)).all()
        assert len(signals) == 2
        assert len(scan_runs) == 4
        assert scan_runs[-1].matched_symbols == 1
        assert signals[0].extra[scan_job.SCAN_ID_KEY] != signals[1].extra[scan_job.SCAN_ID_KEY]
        assert signals[1].extra[scan_job.CONTINUITY_SCAN_COUNT_KEY] == 1
