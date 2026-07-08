"""Fan-out dispatcher: push a signal to every channel a watchlist entry has
enabled (handoff §8 — Telegram / LINE Notify / Email).

Each per-channel sender is a no-op (returns False) when its credentials are
unset, so callers always get a channel -> bool result map regardless of what
is configured in the environment.
"""

from __future__ import annotations

from packages.notifier import email, line, telegram

# Channel identifiers as stored on WatchedSymbol.channels.
CHANNELS = ("telegram", "line", "email")


def dispatch(channels: list[str], ticker: str, severity: str, score: float, detail: str) -> dict[str, bool]:
    """Send a signal notification to each requested channel.

    Returns a {channel: sent} map; unknown channel names are ignored.
    """
    results: dict[str, bool] = {}

    if "telegram" in channels:
        msg = telegram.format_signal(ticker, severity, score, detail)
        results["telegram"] = telegram.send(msg)

    if "line" in channels:
        msg = line.format_signal(ticker, severity, score, detail)
        results["line"] = line.send(msg)

    if "email" in channels:
        subject, html = email.format_signal(ticker, severity, score, detail)
        results["email"] = email.send(subject, html)

    return results
