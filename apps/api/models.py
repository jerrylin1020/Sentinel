"""SQLModel data models for Sentinel (simplified Phase 1 schema).

Mirrors section 10 of DESIGN-HANDOFF.md. JSON columns are used for the
flexible dict/list fields so we stay portable across SQLite (dev) and
Postgres (docker / prod).
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy.types import JSON
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AssetType(str, Enum):
    equity = "equity"
    crypto = "crypto"


class RuleCategory(str, Enum):
    volume = "volume"
    technical = "technical"
    flow = "flow"
    onchain = "onchain"
    news = "news"
    composite = "composite"


class Severity(str, Enum):
    p1 = "p1"
    p2 = "p2"
    observe = "observe"


class SignalStatus(str, Enum):
    new = "new"
    seen = "seen"
    acted = "acted"
    dismissed = "dismissed"


# --- Watchlist ---------------------------------------------------------------


class Symbol(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    ticker: str = Field(index=True)
    name: str = ""
    asset_type: AssetType = Field(sa_column=Column(SAEnum(AssetType)))
    exchange: str = ""


class WatchedSymbol(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    symbol_id: int = Field(foreign_key="symbol.id", index=True)
    group: str = "default"
    p1_score_threshold: float = 7.0
    volume_multiplier: float = 2.0
    enabled_rules: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    channels: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    notes: str = ""


# --- Rules -------------------------------------------------------------------


class Rule(SQLModel, table=True):
    id: str = Field(primary_key=True)  # e.g. "volume_spike_2x"
    name: str
    category: RuleCategory = Field(sa_column=Column(SAEnum(RuleCategory)))
    description: str = ""
    applies_to: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    weight: float = 1.0
    timeframe: str = "1d"  # candle interval this rule's lookback windows assume
    params: dict = Field(default_factory=dict, sa_column=Column(JSON))
    enabled: bool = True


class RuleBacktestStats(SQLModel, table=True):
    rule_id: str = Field(foreign_key="rule.id", primary_key=True)
    period: str = ""  # e.g. "1000d"
    win_rate: float = 0.0
    avg_return: float = 0.0
    false_positive_rate: float = 0.0
    sharpe: float = 0.0
    triggers_per_day: float = 0.0
    sample_triggers: int = 0
    updated_at: datetime = Field(
        default_factory=utcnow, sa_column=Column(DateTime(timezone=True))
    )


# --- Signals -----------------------------------------------------------------


class Signal(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    symbol_id: int = Field(foreign_key="symbol.id", index=True)
    rule_id: str = Field(foreign_key="rule.id", index=True)
    triggered_at: datetime = Field(
        default_factory=utcnow, sa_column=Column(DateTime(timezone=True), index=True)
    )
    severity: Severity = Field(sa_column=Column(SAEnum(Severity)))
    score: float = 0.0
    score_components: dict = Field(default_factory=dict, sa_column=Column(JSON))
    price_at_trigger: float = 0.0
    volume_multiplier: float = 0.0
    extra: dict = Field(default_factory=dict, sa_column=Column(JSON))
    dedup_key: str = Field(default="", index=True)
    notified_channels: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    notified_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    status: SignalStatus = Field(
        default=SignalStatus.new, sa_column=Column(SAEnum(SignalStatus))
    )
