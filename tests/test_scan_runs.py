from datetime import datetime, timezone

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from apps.api.models import ScanRun
from apps.api.routers.scan_runs import latest_scan_run


def test_latest_scan_run_returns_the_most_recent_completed_scan():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all([
            ScanRun(
                started_at=datetime(2026, 7, 16, 0, 0, tzinfo=timezone.utc),
                finished_at=datetime(2026, 7, 16, 0, 1, tzinfo=timezone.utc),
                status="succeeded",
                scanned_symbols=4,
                matched_symbols=1,
            ),
            ScanRun(
                started_at=datetime(2026, 7, 16, 0, 5, tzinfo=timezone.utc),
                finished_at=datetime(2026, 7, 16, 0, 6, tzinfo=timezone.utc),
                status="partial",
                scanned_symbols=4,
                matched_symbols=2,
                failed_symbols=1,
                errors=["WLDUSDT: data fetch failed"],
            ),
        ])
        session.commit()

        result = latest_scan_run(session=session)

    assert result is not None
    assert result["started_at"].replace(tzinfo=timezone.utc) == datetime(2026, 7, 16, 0, 5, tzinfo=timezone.utc)
    assert result["finished_at"].replace(tzinfo=timezone.utc) == datetime(2026, 7, 16, 0, 6, tzinfo=timezone.utc)
    assert result["status"] == "partial"
    assert result["scanned_symbols"] == 4
    assert result["matched_symbols"] == 2
    assert result["failed_symbols"] == 1
    assert result["errors"] == ["WLDUSDT: data fetch failed"]
