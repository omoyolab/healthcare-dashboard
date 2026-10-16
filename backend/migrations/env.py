"""Alembic environment: async engine, URL and metadata from the application."""

import asyncio
from logging.config import fileConfig
from typing import Any

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

import app.models  # noqa: F401  - registers every model on Base.metadata
from app.core.config import get_settings
from app.db.base import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
target_metadata = Base.metadata

# Created by hand in the initial migration because autogenerate cannot express
# a GIN expression index; excluded here so it is not reported as a stray index.
HAND_WRITTEN_INDEXES = {"ix_patients_search_trgm"}


def include_object(
    obj: Any, name: str | None, type_: str, reflected: bool, compare_to: Any
) -> bool:
    return not (type_ == "index" and name in HAND_WRITTEN_INDEXES)


def _configure(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
        # Without these, a changed column type or server default is silently
        # missed by autogenerate.
        compare_type=True,
        compare_server_default=True,
    )


def run_migrations_offline() -> None:
    context.configure(
        url=settings.sqlalchemy_dsn,
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(settings.sqlalchemy_dsn, poolclass=None)
    async with engine.connect() as connection:
        await connection.run_sync(_configure)
        await connection.run_sync(lambda _: context.run_migrations())
        await connection.commit()
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
