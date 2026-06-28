"""Gap Up — fires when the latest bar opens significantly above the previous
close (mostly an equity signal; crypto rarely gaps)."""

from __future__ import annotations

from packages.scanner.rules.base import rule
from packages.shared.types import Candle, RuleHit


@rule(
    id="gap_up",
    name="Gap Up",
    category="technical",
    description="Latest bar opens >= threshold above the previous close.",
    applies_to=["equity", "crypto"],
    weight=1.5,
    default_params={"min_gap": 0.02},
)
def gap_up(candles: list[Candle], params: dict) -> RuleHit | None:
    min_gap = float(params["min_gap"])
    if len(candles) < 2:
        return None

    prev_close = candles[-2].close
    today_open = candles[-1].open
    if prev_close <= 0 or today_open <= 0:
        return None

    gap = (today_open - prev_close) / prev_close
    if gap < min_gap:
        return None

    return RuleHit(
        rule_id="gap_up",
        severity="observe",
        detail=f"Gapped up +{gap * 100:.1f}% at the open",
        metrics={"price": candles[-1].close, "gap": round(gap, 4)},
    )
