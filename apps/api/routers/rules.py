from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from apps.api.db import get_session
from apps.api.models import Rule

router = APIRouter(prefix="/rules", tags=["rules"])


@router.get("")
def list_rules(session: Session = Depends(get_session)):
    return session.exec(select(Rule)).all()


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
