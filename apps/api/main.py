from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from apps.api.config import settings
from apps.api.db import engine, init_db
from apps.api.routers import candles, cron, rules, signals, watchlist
from apps.api.services.seed import seed_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.autoseed:
        init_db()
        with Session(engine) as session:
            seed_all(session)
    yield


app = FastAPI(title="Sentinel API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def cache_public_reads(request: Request, call_next):
    """Let Vercel's edge serve short-lived public reads without waking Python.

    Sentinel is currently a single-tenant public API. Keep mutation and cron
    endpoints uncached; the short TTL bounds staleness after each 5-minute scan.
    """
    response = await call_next(request)
    path = request.url.path
    # Watchlist is intentionally excluded: mutations are immediately reflected
    # through the Next.js tagged cache, while a second Vercel edge cache here
    # can replay deleted rows after a successful DELETE.
    cacheable = path in {"/signals", "/rules", "/health"} or path.startswith("/candles/")
    if request.method == "GET" and response.status_code == 200 and cacheable:
        ttl = 30
        response.headers["Cache-Control"] = f"public, s-maxage={ttl}, stale-while-revalidate={ttl * 4}"
    return response

app.include_router(watchlist.router)
app.include_router(rules.router)
app.include_router(signals.router)
app.include_router(candles.router)
app.include_router(cron.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "sentinel-api"}
