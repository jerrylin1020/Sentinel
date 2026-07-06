from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from apps.api.db import get_session
from apps.api.models import Rule, RuleBacktestStats

router = APIRouter(prefix="/rules", tags=["rules"])


@router.get("")
def list_rules(session: Session = Depends(get_session)):
    out = []
    for r in session.exec(select(Rule)).all():
        stats = session.get(RuleBacktestStats, r.id)
        out.append(
            {
                "id": r.id,
                "name": r.name,
                "category": r.category.value,
                "description": r.description,
                "applies_to": r.applies_to,
                "weight": r.weight,
                "timeframe": r.timeframe,
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
