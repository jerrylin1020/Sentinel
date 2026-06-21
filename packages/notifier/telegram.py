"""Telegram Bot notifier (simplest channel — handoff §8).

Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID. If unset, send() is a no-op that
returns False so the demo still runs end-to-end without credentials.
"""

from __future__ import annotations

import httpx

from apps.api.config import settings


def send(text: str, *, token: str | None = None, chat_id: str | None = None) -> bool:
    token = token or settings.telegram_bot_token
    chat_id = chat_id or settings.telegram_chat_id
    if not token or not chat_id:
        return False

    resp = httpx.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
        timeout=10.0,
    )
    resp.raise_for_status()
    return True


def format_signal(ticker: str, severity: str, score: float, detail: str) -> str:
    badge = {"p1": "🔴 P1", "p2": "🟡 P2", "observe": "⚪ OBSERVE"}.get(severity, severity)
    return (
        f"<b>{badge} · {ticker}</b>\n"
        f"Score: <b>{score}</b>\n"
        f"{detail}"
    )
