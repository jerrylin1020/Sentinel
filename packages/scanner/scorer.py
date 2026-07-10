"""Confluence scoring — turns a set of RuleHits into a single score + severity.

Implements the formula sketched in handoff §5:
    score = Σ(weight × severity) × confluence_bonus(n_rules)
"""

from __future__ import annotations

from dataclasses import dataclass

from packages.scanner.rules.base import registry
from packages.shared.types import RuleHit

SEVERITY_WEIGHT = {"observe": 0.5, "p2": 1.0, "p1": 1.5}
CONFLUENCE_BONUS = 0.15  # +15% when >= 3 rules fire together
P1_MIN_SCORE = 7.5
P1_MIN_RULES = 3


@dataclass
class ScoreResult:
    score: float
    severity: str  # "p1" | "p2" | "observe"
    components: dict


def score_hits(
    hits: list[RuleHit],
    p1_min_score: float = P1_MIN_SCORE,
    rule_weights: dict[str, float] | None = None,
) -> ScoreResult:
    if not hits:
        return ScoreResult(0.0, "observe", {})

    components: dict[str, float] = {}
    base = 0.0
    for hit in hits:
        spec = registry.get(hit.rule_id)
        weight = (rule_weights or {}).get(hit.rule_id, spec.weight if spec else 1.0)
        contribution = weight * SEVERITY_WEIGHT.get(hit.severity, 1.0)
        components[hit.rule_id] = round(contribution, 3)
        base += contribution

    n = len(hits)
    if n >= P1_MIN_RULES:
        base *= 1 + CONFLUENCE_BONUS

    score = round(base, 2)

    if score >= p1_min_score and n >= P1_MIN_RULES:
        severity = "p1"
    elif any(h.severity in ("p1", "p2") for h in hits):
        severity = "p2"
    else:
        severity = "observe"

    return ScoreResult(score=score, severity=severity, components=components)
