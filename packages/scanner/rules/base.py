"""Rule registry and the RuleSpec contract.

A rule is a pure function:  (series, params) -> RuleHit | None
plus metadata used for scoring and persistence. Each rule registers itself
via the @rule decorator so the engine can discover the full rule library.

`timeframe` declares which candle interval a rule expects (e.g. "1d" for
daily bars). The engine itself is timeframe-agnostic — it evaluates
whatever `candles` list it's given — but every rule assumes a specific bar
size for its lookback windows to be meaningful (e.g. "52-week high" only
means what it says if fed daily bars). Callers (scripts/demo_scan.py,
scripts/run_backtest.py) currently fetch daily bars for every symbol, so
every rule in this registry is written and tested against `timeframe="1d"`.

`data_source` declares what kind of series a rule expects: "candles" (the
default — OHLCV bars) or "funding_rate" (a list of FundingRatePoint from a
perpetual futures funding-rate history). The engine routes each rule to the
matching series so a funding-rate rule never receives OHLCV candles and
vice versa. Rules with a non-"candles" data_source are currently skipped by
the weekly backtester (scripts/run_backtest.py), since it only knows how to
walk OHLCV bar-by-bar for forward-return scoring.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from packages.shared.types import Candle, RuleHit

RuleFn = Callable[[list, dict], "RuleHit | None"]


@dataclass
class RuleSpec:
    id: str
    name: str
    category: str
    trigger_severity: str
    description: str
    applies_to: list[str]
    weight: float
    timeframe: str
    data_source: str = "candles"
    default_params: dict = field(default_factory=dict)
    fn: RuleFn | None = None

    def evaluate(self, series: list, params: dict | None = None) -> RuleHit | None:
        merged = {**self.default_params, **(params or {})}
        assert self.fn is not None
        return self.fn(series, merged)


registry: dict[str, RuleSpec] = {}


def rule(
    *,
    id: str,
    name: str,
    category: str,
    trigger_severity: str,
    description: str,
    applies_to: list[str],
    weight: float,
    timeframe: str,
    data_source: str = "candles",
    default_params: dict | None = None,
) -> Callable[[RuleFn], RuleSpec]:
    def deco(fn: RuleFn) -> RuleSpec:
        spec = RuleSpec(
            id=id,
            name=name,
            category=category,
            trigger_severity=trigger_severity,
            description=description,
            applies_to=applies_to,
            weight=weight,
            timeframe=timeframe,
            data_source=data_source,
            default_params=default_params or {},
            fn=fn,
        )
        registry[id] = spec
        return spec

    return deco
