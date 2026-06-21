"""Shared lightweight types used across scanner / data / notifier packages."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class Candle:
    """A single OHLCV bar."""

    ts: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass
class RuleHit:
    """Result of a rule evaluating to True for a symbol."""

    rule_id: str
    severity: str  # "p1" | "p2" | "observe"
    detail: str
    metrics: dict = field(default_factory=dict)
