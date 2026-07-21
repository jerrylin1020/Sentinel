"""LINE Notify channel (handoff §8).

Set LINE_NOTIFY_TOKEN (per-user/group access token issued at
https://notify-bot.line.me/my/). If unset, send() is a no-op that returns
False so the demo still runs end-to-end without credentials.
"""

from __future__ import annotations

import httpx

from apps.api.config import settings


def send(text: str, *, token: str | None = None) -> bool:
    token = token or settings.line_notify_token
    if not token:
        return False

    resp = httpx.post(
        "https://notify-api.line.me/api/notify",
        headers={"Authorization": f"Bearer {token}"},
        data={"message": text},
        timeout=2.0,
    )
    resp.raise_for_status()
    return True


def format_signal(ticker: str, severity: str, score: float, detail: str) -> str:
    badge = {"p1": "🔴 P1", "p2": "🟡 P2", "observe": "⚪ OBSERVE"}.get(severity, severity)
    return f"\n{badge} · {ticker}\nScore: {score}\n{detail}"
