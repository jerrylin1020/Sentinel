"""Rule execution engine — runs enabled rules over a symbol's candles and
returns a scored result ready to be persisted as a Signal."""

from __future__ import annotations

from dataclasses import dataclass

from packages.scanner.rules import registry  # noqa: F401 (ensures rules import)
from packages.scanner.rules.base import registry as rule_registry
from packages.scanner.scorer import ScoreResult, score_hits
from packages.shared.types import Candle, FundingRatePoint, RuleHit


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
    funding_rates: list[FundingRatePoint] | None = None,
    rule_weights: dict[str, float] | None = None,
) -> ScanResult:
    """Run every applicable rule against the right data series.

    Most rules are `data_source="candles"` and evaluate `candles`. A rule
    declared with a different `data_source` (e.g. "funding_rate") is instead
    fed the matching series below, and is skipped entirely if that series
    wasn't supplied (e.g. funding rate wasn't fetched, or the asset has no
    perpetual contract).
    """
    params_overrides = params_overrides or {}
    hits: list[RuleHit] = []

    series_by_source = {
        "candles": candles,
        "funding_rate": funding_rates,
    }

    for rule_id, spec in rule_registry.items():
        if enabled_rules is not None and rule_id not in enabled_rules:
            continue
        if asset_type not in spec.applies_to:
            continue
        series = series_by_source.get(spec.data_source, candles)
        if series is None:
            continue
        hit = spec.evaluate(series, params_overrides.get(rule_id))
        if hit is not None:
            hits.append(hit)

    score_kwargs = {} if p1_min_score is None else {"p1_min_score": p1_min_score}
    return ScanResult(
        ticker=ticker,
        hits=hits,
        score=score_hits(hits, rule_weights=rule_weights, **score_kwargs),
    )
