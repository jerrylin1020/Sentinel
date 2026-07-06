"""Tests for the Email / LINE / dispatch notification channels.

Mirrors the existing Telegram notifier: senders are pure no-ops (return
False) when credentials are unset, so tests don't need network mocking for
the "unconfigured" path. The "configured" path is tested against a stubbed
httpx.post via monkeypatch.
"""

from __future__ import annotations

import httpx

from apps.api.config import settings
from packages.notifier import dispatch, email, line, telegram


def test_line_send_noop_without_token(monkeypatch):
    monkeypatch.setattr(settings, "line_notify_token", "")
    assert line.send("hello") is False


def test_line_send_posts_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "line_notify_token", "tok")
    calls = {}

    def fake_post(url, headers=None, data=None, timeout=None):
        calls["url"] = url
        calls["headers"] = headers
        calls["data"] = data
        return httpx.Response(200, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)
    assert line.send("hello", token="tok") is True
    assert calls["url"] == "https://notify-api.line.me/api/notify"
    assert calls["headers"]["Authorization"] == "Bearer tok"
    assert calls["data"] == {"message": "hello"}


def test_line_format_signal_contains_ticker_and_score():
    msg = line.format_signal("AAPL", "p1", 8.5, "detail text")
    assert "AAPL" in msg
    assert "8.5" in msg
    assert "P1" in msg


def test_email_send_noop_without_credentials(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "")
    monkeypatch.setattr(settings, "email_to", "")
    assert email.send("subject", "<p>body</p>") is False


def test_email_send_posts_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "key")
    monkeypatch.setattr(settings, "email_to", "user@example.com")
    monkeypatch.setattr(settings, "email_from", "signals@sentinel.local")
    calls = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        calls["url"] = url
        calls["headers"] = headers
        calls["json"] = json
        return httpx.Response(200, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)
    assert email.send("subject", "<p>body</p>") is True
    assert calls["url"] == "https://api.resend.com/emails"
    assert calls["headers"]["Authorization"] == "Bearer key"
    assert calls["json"]["to"] == ["user@example.com"]
    assert calls["json"]["subject"] == "subject"


def test_email_format_signal_returns_subject_and_html():
    subject, html = email.format_signal("BTCUSDT", "p2", 6.0, "detail")
    assert "BTCUSDT" in subject
    assert "BTCUSDT" in html
    assert "P2" in subject


def test_dispatch_only_sends_to_requested_channels(monkeypatch):
    monkeypatch.setattr(telegram, "send", lambda msg: True)
    monkeypatch.setattr(line, "send", lambda msg: True)
    monkeypatch.setattr(email, "send", lambda subject, html: True)

    result = dispatch.dispatch(["telegram"], "AAPL", "p1", 9.0, "detail")
    assert result == {"telegram": True}


def test_dispatch_reports_per_channel_result(monkeypatch):
    monkeypatch.setattr(telegram, "send", lambda msg: True)
    monkeypatch.setattr(line, "send", lambda msg: False)
    monkeypatch.setattr(email, "send", lambda subject, html: False)

    result = dispatch.dispatch(["telegram", "line", "email"], "AAPL", "p1", 9.0, "detail")
    assert result == {"telegram": True, "line": False, "email": False}


def test_dispatch_ignores_unknown_channels(monkeypatch):
    monkeypatch.setattr(telegram, "send", lambda msg: True)
    result = dispatch.dispatch(["telegram", "discord"], "AAPL", "p1", 9.0, "detail")
    assert result == {"telegram": True}
