"""Vercel serverless entrypoint for the FastAPI backend.

Vercel's Python runtime serves the ASGI `app` exported here. Deploy this as a
separate Vercel project with the repo root as the root directory. Set env vars
DATABASE_URL and AUTOSEED=false (DB is already seeded by the cron/local).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from apps.api.main import app  # noqa: E402,F401
