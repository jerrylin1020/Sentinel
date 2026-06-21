from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from apps.api.config import settings

_is_sqlite = settings.database_url.startswith("sqlite")

if _is_sqlite:
    connect_args: dict = {"check_same_thread": False}
    engine = create_engine(settings.database_url, echo=False, connect_args=connect_args)
else:
    # Postgres (e.g. Supabase pooler). Disable psycopg auto-prepared statements
    # so we work with both transaction- and session-mode poolers, and pre-ping
    # to survive idle connection drops on free tiers.
    connect_args = {"prepare_threshold": None}
    engine = create_engine(
        settings.database_url,
        echo=False,
        connect_args=connect_args,
        pool_pre_ping=True,
    )


def init_db() -> None:
    # Import models so SQLModel.metadata is populated before create_all.
    from apps.api import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
