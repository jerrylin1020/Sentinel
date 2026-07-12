from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlmodel import Session, select

from apps.api.db import get_session
from apps.api.models import Rule, Severity, Signal, Symbol
from packages.scanner.rules import registry

router = APIRouter(prefix="/signals", tags=["signals"])
TAIPEI = ZoneInfo("Asia/Taipei")


@router.get("")
def list_signals(
    severity: Severity | None = None,
    limit: int = 100,
    offset: int = 0,
    ticker: str | None = None,
    sort: str = "latest",
    signal_date: date | None = None,
    days: int | None = None,
    session: Session = Depends(get_session),
):
    stmt = select(Signal)
    if ticker:
        symbol = session.exec(
            select(Symbol).where(func.upper(Symbol.ticker) == ticker.upper())
        ).first()
        if symbol is None:
            return []
        stmt = stmt.where(Signal.symbol_id == symbol.id)
    if severity is not None:
        stmt = stmt.where(Signal.severity == severity)
    if signal_date or days:
        end_day = signal_date or datetime.now(TAIPEI).date()
        range_days = min(max(days or 1, 1), 31)
        start_day = end_day - timedelta(days=range_days - 1)
        start = datetime.combine(start_day, time.min, TAIPEI).astimezone(timezone.utc)
        end = datetime.combine(end_day + timedelta(days=1), time.min, TAIPEI).astimezone(timezone.utc)
        stmt = stmt.where(Signal.triggered_at >= start, Signal.triggered_at < end)

    bounded_limit = min(max(limit, 1), 500)
    bounded_offset = max(offset, 0)
    if sort == "score_desc":
        stmt = stmt.order_by(Signal.score.desc(), Signal.triggered_at.desc())
    elif sort == "score_asc":
        stmt = stmt.order_by(Signal.score.asc(), Signal.triggered_at.desc())
    else:
        stmt = stmt.order_by(Signal.triggered_at.desc())
    stmt = stmt.offset(bounded_offset).limit(bounded_limit)

    signals = session.exec(stmt).all()

    # Batch-fetch every Symbol/Rule referenced by this page of signals up
    # front instead of one round-trip per row (was N+1: ~80+ individual
    # queries for ~28 signals, ~16s over the Supabase pooler). One query per
    # table regardless of result size keeps this fast even as signals grow.
    symbol_ids = {sig.symbol_id for sig in signals}
    rule_ids = {rid for sig in signals for rid in (sig.score_components or {}).keys()}
    symbols_by_id = (
        {s.id: s for s in session.exec(select(Symbol).where(Symbol.id.in_(symbol_ids)))}
        if symbol_ids
        else {}
    )
    rules_by_id = (
        {r.id: r for r in session.exec(select(Rule).where(Rule.id.in_(rule_ids)))}
        if rule_ids
        else {}
    )

    out = []
    for sig in signals:
        sym = symbols_by_id.get(sig.symbol_id)
        # rules = which specific rule(s) fired, with a human-readable reason —
        # not just the category tag, so the UI can show *why* a signal exists.
        rules = []
        tags = []
        extra = sig.extra or {}
        for rid in (sig.score_components or {}).keys():
            r = rules_by_id.get(rid)
            entry = extra.get(rid) or {}
            # Older signals stored `extra[rule_id]` as the raw metrics dict
            # directly (no "detail" key) — fall back gracefully.
            detail = entry.get("detail", "") if isinstance(entry, dict) else ""
            rules.append(
                {
                    "id": rid,
                    "name": r.name if r else rid,
                    "category": r.category.value if r else "",
                    "detail": detail,
                    "trigger_severity": entry.get(
                        "trigger_severity",
                        registry[rid].trigger_severity if rid in registry else "observe",
                    ),
                    "weight": entry.get("weight", r.weight if r else 1.0),
                    "contribution": (sig.score_components or {}).get(rid, 0.0),
                }
            )
            if r:
                tags.append(r.category.value)
        out.append(
            {
                "id": sig.id,
                "ticker": sym.ticker if sym else "?",
                "name": sym.name if sym else "",
                "asset_type": sym.asset_type.value if sym else "",
                "severity": sig.severity.value,
                "score": sig.score,
                "tags": sorted(set(tags)),
                "rules": rules,
                "price": sig.price_at_trigger,
                "triggered_at": sig.triggered_at,
                "status": sig.status.value,
                "components": sig.score_components,
                "metrics": sig.extra,
            }
        )
    return out
