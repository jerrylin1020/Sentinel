"""Seed the database with the rule library and starter watchlist."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import Session  # noqa: E402

from apps.api.db import engine, init_db  # noqa: E402
from apps.api.services.seed import seed_all  # noqa: E402

if __name__ == "__main__":
    init_db()
    with Session(engine) as session:
        seed_all(session)
    print("Seeded rules + watchlist.")
