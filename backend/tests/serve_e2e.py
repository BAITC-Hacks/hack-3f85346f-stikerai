"""Isolated real API for browser tests. Never uses the application's database or AI key."""
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if __name__ == "__main__":
    import uvicorn
    from alembic import command
    from alembic.config import Config
    from sqlalchemy.orm import Session
    with tempfile.TemporaryDirectory(prefix="stikerai-e2e-") as directory:
        os.environ["DATABASE_URL"] = "sqlite:///" + (Path(directory) / "test.db").as_posix()
        os.environ.pop("OPENAI_API_KEY", None)
        os.environ.pop("OPENAI_MODEL", None)
        os.environ["COOKIE_SECURE"] = "false"
        from app.db import get_engine
        from app.seed import seed
        command.upgrade(Config("alembic.ini"), "head")
        with Session(get_engine()) as session, session.begin():
            seed(session)
        try:
            uvicorn.run("app.main:app", host="127.0.0.1", port=int(os.getenv("E2E_API_PORT", "8001")))
        finally:
            get_engine().dispose()
