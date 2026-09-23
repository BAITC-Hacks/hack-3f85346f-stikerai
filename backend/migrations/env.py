from alembic import context
from sqlalchemy import create_engine, pool

from app.db import database_url
from app.models import Base


def run_migrations() -> None:
    supplied_connection = context.config.attributes.get("connection")
    if supplied_connection is not None:
        context.configure(connection=supplied_connection, target_metadata=Base.metadata,
                          compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
    elif context.is_offline_mode():
        context.configure(url=database_url(), target_metadata=Base.metadata,
                          literal_binds=True, dialect_opts={"paramstyle": "named"})
        with context.begin_transaction():
            context.run_migrations()
    else:
        engine = create_engine(database_url(), poolclass=pool.NullPool)
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=Base.metadata,
                              compare_type=True)
            with context.begin_transaction():
                context.run_migrations()
        engine.dispose()


run_migrations()
