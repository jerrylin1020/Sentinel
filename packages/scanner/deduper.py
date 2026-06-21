"""Signal de-duplication (handoff §5 / §13).

A dedup key collapses "same symbol + same rule set" within a time bucket so the
user is not spammed. The default bucket is 1 hour.
"""

from __future__ import annotations

from datetime import datetime, timezone


def dedup_key(ticker: str, rule_ids: list[str], when: datetime | None = None, bucket_hours: int = 1) -> str:
    when = when or datetime.now(timezone.utc)
    bucket = int(when.timestamp() // (bucket_hours * 3600))
    rules = "+".join(sorted(rule_ids))
    return f"{ticker}:{rules}:{bucket}"
