"""Rule execution engine — runs enabled rules over a symbol's candles and
returns a scored result ready to be persisted as a Signal.

Implements the 4-layer hierarchical decision tree described in the report.
"""

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
    stop_loss_price: float | None = None


def _sma(closes: list[float], period: int) -> float:
    if len(closes) < period:
        return 0.0
    return sum(closes[-period:]) / period


def scan_symbol(
    ticker: str,
    asset_type: str,
    candles: list[Candle],
    enabled_rules: list[str] | None = None,
    params_overrides: dict[str, dict] | None = None,
    p1_min_score: float | None = None,
    funding_rates: list[FundingRatePoint] | None = None,
    rule_weights: dict[str, float] | None = None,
    benchmark_candles: dict[str, list[Candle]] | None = None,
) -> ScanResult:
    """Run every applicable rule against the right data series.

    Organized as a 4-Layer Hierarchical Decision Tree.
    """
    params_overrides = params_overrides or {}
    closes = [c.close for c in candles]

    # --- Layer 1: Regime & Flow Filter (Kill Switch) ---
    regime_ok = True
    regime_details = []

    # 1. Trend check (SMA 50 > 150 > 200 + SMA 200 slope > 0)
    if len(candles) >= 200:
        sma50 = _sma(closes, 50)
        sma150 = _sma(closes, 150)
        sma200 = _sma(closes, 200)

        # Calculate 20-day slope of SMA 200
        sma200_series = []
        for i in range(len(closes) - 20, len(closes)):
            sma200_series.append(_sma(closes[: i + 1], 200))

        from packages.scanner.indicators import linear_regression_slope

        slopes = linear_regression_slope(sma200_series, 20)
        slope200 = slopes[-1] if slopes else 0.0

        trend_aligned = (sma50 > sma150 > sma200)
        slope_ok = (slope200 > 0)

        if not (trend_aligned and slope_ok):
            regime_ok = False
            regime_details.append(
                f"Trend not aligned (50MA > 150MA > 200MA: {trend_aligned}, 200MA slope: {slope200:.4f})"
            )

    # 2. Relative Strength check (Near MRS > Far MRS > 0)
    benchmark = benchmark_candles.get(asset_type) if benchmark_candles else None
    if benchmark and len(candles) >= 124:
        bench_by_date = {b.ts.date(): b.close for b in benchmark if b.close > 0}

        aligned_closes = []
        aligned_bench = []
        for c in candles:
            dt = c.ts.date()
            if dt in bench_by_date:
                aligned_closes.append(c.close)
                aligned_bench.append(bench_by_date[dt])

        if len(aligned_closes) >= 124:
            rsd_list = [(ac / ab) * 100.0 for ac, ab in zip(aligned_closes, aligned_bench)]
            near_sma = sum(rsd_list[-20:]) / 20.0
            near_mrs = ((rsd_list[-1] / near_sma) - 1) * 100.0 if near_sma > 0 else 0.0

            far_sma = sum(rsd_list[-123:]) / 123.0
            far_mrs = ((rsd_list[-1] / far_sma) - 1) * 100.0 if far_sma > 0 else 0.0

            mrs_ok = (near_mrs > far_mrs) and (near_mrs > 0) and (far_mrs > 0)
            if not mrs_ok:
                regime_ok = False
                regime_details.append(
                    f"MRS not bullish (Near MRS {near_mrs:.2f} <= Far MRS {far_mrs:.2f} or <= 0)"
                )

    # --- Run Rules (Layer 2 & Layer 3) ---
    raw_hits: list[RuleHit] = []
    series_by_source = {
        "candles": candles,
        "funding_rate": funding_rates,
    }

    # Inject benchmark into params_overrides for rules that need it
    for rule_id, spec in rule_registry.items():
        if enabled_rules is not None and rule_id not in enabled_rules:
            continue
        if asset_type not in spec.applies_to:
            continue
        series = series_by_source.get(spec.data_source, candles)
        if series is None:
            continue

        rule_params = params_overrides.get(rule_id) or {}
        if benchmark_candles:
            rule_params = {**rule_params, "_benchmark_candles": benchmark.copy() if benchmark else None}

        hit = spec.evaluate(series, rule_params)
        if hit is not None:
            raw_hits.append(hit)

    # Breakout/momentum rules that are blocked if Layer 1 Regime is not bullish (Kill Switch)
    breakout_rules = {
        "breakout_52w",
        "bollinger_breakout",
        "bollinger_squeeze_breakout",
        "vcp_contraction",
        "adaptive_ttm_squeeze",
        "gap_up",
        "price_momentum",
        "long_green_candle",
        "golden_cross",
        "ma200_breakout",
    }

    hits: list[RuleHit] = []
    blocked_breakouts = []

    for hit in raw_hits:
        if hit.rule_id in breakout_rules and not regime_ok:
            blocked_breakouts.append(hit.rule_id)
        else:
            hits.append(hit)

    score_kwargs = {} if p1_min_score is None else {"p1_min_score": p1_min_score}
    score_result = score_hits(hits, rule_weights=rule_weights, **score_kwargs)

    # If breakouts were blocked, add a special notice hit to explain why (after scoring)
    if blocked_breakouts:
        reasons = "; ".join(regime_details)
        hits.append(
            RuleHit(
                rule_id="regime_kill",
                severity="observe",
                detail=f"Blocked breakouts [{', '.join(blocked_breakouts)}] due to bearish regime: {reasons}",
                metrics={"blocked": blocked_breakouts, "reasons": regime_details},
            )
        )

    # --- Layer 4: Asymmetric Risk Management ---
    stop_loss_price = None
    for hit in hits:
        if "tight_low" in hit.metrics:
            stop_loss_price = hit.metrics["tight_low"]
            break

    return ScanResult(
        ticker=ticker,
        hits=hits,
        score=score_result,
        stop_loss_price=stop_loss_price,
    )
