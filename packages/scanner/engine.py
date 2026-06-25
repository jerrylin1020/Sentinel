"""Rule execution engine — runs enabled rules over a symbol's candles and
returns a scored result ready to be persisted as a Signal."""

from __future__ import annotations

from dataclasses import dataclass

from packages.scanner.rules import registry  # noqa: F401 (ensures rules import)
from packages.scanner.rules.base import registry as rule_registry
from packages.scanner.scorer import ScoreResult, score_hits
from packages.shared.types import Candle, RuleHit


@dataclass
class ScanResult:
    ticker: str
    hits: list[RuleHit]
    score: ScoreResult


def scan_symbol(
    ticker: str,
    asset_type: str,
    candles: list[Candle],
    enabled_rules: list[str] | None = None,
    params_overrides: dict[str, dict] | None = None,
    p1_min_score: float | None = None,
) -> ScanResult:
    params_overrides = params_overrides or {}
    hits: list[RuleHit] = []

    for rule_id, spec in rule_registry.items():
        if enabled_rules is not None and rule_id not in enabled_rules:
            continue
        if asset_type not in spec.applies_to:
            continue
        hit = spec.evaluate(candles, params_overrides.get(rule_id))
        if hit is not None:
            hits.append(hit)

    score_kwargs = {} if p1_min_score is None else {"p1_min_score": p1_min_score}
    return ScanResult(ticker=ticker, hits=hits, score=score_hits(hits, **score_kwargs))
