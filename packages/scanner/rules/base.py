"""Rule registry and the RuleSpec contract.

A rule is a pure function:  (candles, params) -> RuleHit | None
plus metadata used for scoring and persistence. Each rule registers itself
via the @rule decorator so the engine can discover the full rule library.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from packages.shared.types import Candle, RuleHit

RuleFn = Callable[[list[Candle], dict], "RuleHit | None"]


@dataclass
class RuleSpec:
    id: str
    name: str
    category: str
    description: str
    applies_to: list[str]
    weight: float
    default_params: dict = field(default_factory=dict)
    fn: RuleFn | None = None

    def evaluate(self, candles: list[Candle], params: dict | None = None) -> RuleHit | None:
        merged = {**self.default_params, **(params or {})}
        assert self.fn is not None
        return self.fn(candles, merged)


registry: dict[str, RuleSpec] = {}


def rule(
    *,
    id: str,
    name: str,
    category: str,
    description: str,
    applies_to: list[str],
    weight: float,
    default_params: dict | None = None,
) -> Callable[[RuleFn], RuleSpec]:
    def deco(fn: RuleFn) -> RuleSpec:
        spec = RuleSpec(
            id=id,
            name=name,
            category=category,
            description=description,
            applies_to=applies_to,
            weight=weight,
            default_params=default_params or {},
            fn=fn,
        )
        registry[id] = spec
        return spec

    return deco
