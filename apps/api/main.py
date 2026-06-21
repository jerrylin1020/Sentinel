from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from apps.api.db import engine, init_db
from apps.api.routers import rules, signals, watchlist
from apps.api.services.seed import seed_all


@asynccontextmanager
async def lifespan(app: FastAPI):
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

app.include_router(watchlist.router)
app.include_router(rules.router)
app.include_router(signals.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "sentinel-api"}
