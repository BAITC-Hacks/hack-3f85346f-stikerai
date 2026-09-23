import os
from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, URL
from sqlalchemy.orm import Session


def database_url() -> str | URL:
    if configured := os.environ.get("DATABASE_URL"):
        return configured
    # URL.create safely handles punctuation in passwords supplied by Compose.
    return URL.create(
        "postgresql+psycopg",
        username=os.environ.get("PGUSER", "stikerai"),
        password=os.environ.get("PGPASSWORD", "stikerai"),
        host=os.environ.get("PGHOST", "localhost"),
        port=int(os.environ.get("PGPORT", "5432")),
        database=os.environ.get("PGDATABASE", "stikerai"),
    )


@lru_cache
def get_engine() -> Engine:
    return create_engine(database_url(), pool_pre_ping=True)


def get_session() -> Iterator[Session]:
    # Commit is owned by the caller; uncommitted work is rolled back on close.
    with Session(get_engine()) as session:
        yield session
