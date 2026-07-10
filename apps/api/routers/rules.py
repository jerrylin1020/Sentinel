from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from apps.api.db import get_session
from apps.api.models import Rule, RuleBacktestStats
from packages.scanner.rules import registry

router = APIRouter(prefix="/rules", tags=["rules"])


@router.get("")
def list_rules(session: Session = Depends(get_session)):
    rules = session.exec(select(Rule)).all()
    rule_ids = [r.id for r in rules]
    stats_by_id = (
        {s.rule_id: s for s in session.exec(select(RuleBacktestStats).where(RuleBacktestStats.rule_id.in_(rule_ids)))}
        if rule_ids
        else {}
    )
    out = []
    for r in rules:
        stats = stats_by_id.get(r.id)
        out.append(
            {
                "id": r.id,
                "name": r.name,
                "category": r.category.value,
                "trigger_severity": registry[r.id].trigger_severity if r.id in registry else "observe",
                "description": r.description,
                "applies_to": r.applies_to,
                "weight": r.weight,
                "timeframe": r.timeframe,
                "data_source": r.data_source,
                "params": r.params,
                "enabled": r.enabled,
                "backtest": (
                    {
                        "win_rate": stats.win_rate,
                        "avg_return": stats.avg_return,
                        "false_positive_rate": stats.false_positive_rate,
                        "sharpe": stats.sharpe,
                        "triggers_per_day": stats.triggers_per_day,
                        "sample_triggers": stats.sample_triggers,
                        "updated_at": stats.updated_at,
                    }
                    if stats
                    else None
                ),
            }
        )
    return out


@router.patch("/{rule_id}")
def update_rule(rule_id: str, payload: dict, session: Session = Depends(get_session)):
    r = session.get(Rule, rule_id)
    if not r:
        raise HTTPException(404, "rule not found")
    for field in ("enabled", "weight", "params"):
        if field in payload:
            setattr(r, field, payload[field])
    session.add(r)
    session.commit()
    session.refresh(r)
    return r
