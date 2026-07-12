"""Stable identity for one continuous signal state."""

from __future__ import annotations

import hashlib
import json


def dedup_key(
    ticker: str,
    rule_ids: list[str],
    severity: str,
    score: float,
    score_components: dict[str, float],
) -> str:
    """Return an identity that ignores live price/detail changes.

    The same rules, severity, and score are one ongoing signal. A changed
    price or rule detail (for example, a candle body percentage) only refreshes
    that signal's latest snapshot.
    """
    payload = {
        "ticker": ticker.upper(),
        "rules": sorted(rule_ids),
        "severity": severity,
        "score": round(score, 4),
        "components": {rule_id: round(value, 4) for rule_id, value in sorted(score_components.items())},
    }
    return hashlib.sha256(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()).hexdigest()
