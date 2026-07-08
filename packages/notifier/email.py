"""Email notifier via Resend REST API (handoff §8).

Set RESEND_API_KEY and EMAIL_TO. If unset, send() is a no-op that returns
False so the demo still runs end-to-end without credentials.

Resend is used instead of raw SMTP to keep the dependency footprint identical
to the other channels (a plain httpx POST, no smtplib server config needed).
"""

from __future__ import annotations

import httpx

from apps.api.config import settings


def send(subject: str, html: str, *, api_key: str | None = None, to: str | None = None) -> bool:
    api_key = api_key or settings.resend_api_key
    to = to or settings.email_to
    if not api_key or not to:
        return False

    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "from": settings.email_from,
            "to": [to],
            "subject": subject,
            "html": html,
        },
        timeout=10.0,
    )
    resp.raise_for_status()
    return True


def format_signal(ticker: str, severity: str, score: float, detail: str) -> tuple[str, str]:
    """Returns (subject, html body)."""
    badge = {"p1": "P1", "p2": "P2", "observe": "OBSERVE"}.get(severity, severity)
    subject = f"[{badge}] {ticker} · score {score}"
    html = f"<b>{badge} · {ticker}</b><br>Score: <b>{score}</b><br>{detail}"
    return subject, html
