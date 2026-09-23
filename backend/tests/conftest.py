import os
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.seed import seed


def migration_config(connection):
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.attributes["connection"] = connection
    return config


@pytest.fixture
def engine():
    url = os.environ.get("TEST_DATABASE_URL")
    admin = None
    schema = "test_" + uuid4().hex
    if url:
        # Each test owns an isolated schema; never drop public/application tables.
        admin = create_engine(url)
        with admin.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        result = create_engine(url, connect_args={"options": f"-csearch_path={schema}"})
    else:
        result = create_engine("sqlite://", poolclass=StaticPool)

        @event.listens_for(result, "connect")
        def enable_foreign_keys(dbapi_connection, _):
            dbapi_connection.execute("PRAGMA foreign_keys=ON")

    try:
        with result.begin() as connection:
            command.upgrade(migration_config(connection), "head")
        yield result
    finally:
        result.dispose()
        if admin is not None:
            with admin.begin() as connection:
                connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
            admin.dispose()


@pytest.fixture
def session(engine):
    with Session(engine) as session:
        with session.begin():
            seed(session)
        yield session
