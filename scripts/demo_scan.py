"""End-to-end Phase 1 demo:

  fetch candles (Binance) -> run scanner -> score -> persist Signal -> notify

Run from repo root:  python scripts/demo_scan.py

Works with zero credentials: if a channel's env vars are unset that channel's
send() is a no-op but the signal is still scored and stored.

This is a thin CLI wrapper around apps.api.services.scan_job.run_scan(), which
is the single source of truth for the scan logic — the same function backs
the /cron/scan HTTP endpoint used by external cron services.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from apps.api.services.scan_job import run_scan  # noqa: E402


def run() -> None:
    summary = run_scan()
    for entry in summary:
        print(f"Scanning {entry['ticker']}...")
        if "error" in entry:
            print(f"  ! {entry['error']}")
        elif entry.get("deduped"):
            print("  deduped (already signalled this hour)")
        elif "signal_id" in entry:
            pushed = (
                ", ".join(f"{ch}={'sent' if ok else 'skipped'}" for ch, ok in entry.get("notified", {}).items())
                or "not pushed (observe)"
            )
            print(f"  SIGNAL #{entry['signal_id']} [{entry['severity']}] score={entry['score']} {pushed}")
            print(f"    {entry['detail']}")
        else:
            print("  no hits")


if __name__ == "__main__":
    run()
