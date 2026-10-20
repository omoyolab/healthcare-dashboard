"""Fixtures for tests that need a real database.

Integration tests run against a throwaway Postgres database. Mocking it would
let wrong SQL pass, which is the one thing these tests exist to catch.

These fixtures deliberately live here rather than in the root conftest: an
autouse database fixture at the root would make every unit test depend on
infrastructure it never uses.
"""

import asyncio
from collections.abc import Iterator

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.main import create_app


async def _recreate_database(settings: Settings) -> None:
    admin_dsn = settings.sqlalchemy_dsn.rsplit("/", 1)[0] + "/postgres"
    engine = create_async_engine(admin_dsn, isolation_level="AUTOCOMMIT")
    try:
        async with engine.connect() as connection:
            await connection.execute(
                text(f'DROP DATABASE IF EXISTS "{settings.postgres_db}" WITH (FORCE)')
            )
            await connection.execute(text(f'CREATE DATABASE "{settings.postgres_db}"'))
    finally:
        await engine.dispose()


async def _truncate(settings: Settings) -> None:
    engine = create_async_engine(settings.sqlalchemy_dsn)
    try:
        async with engine.begin() as connection:
            # Notes go too, via the FK cascade.
            await connection.execute(text("TRUNCATE patients CASCADE"))
    finally:
        await engine.dispose()


@pytest.fixture(scope="session")
def database(settings: Settings) -> None:
    asyncio.run(_recreate_database(settings))
    # Migrate rather than create_all: this also proves the migration is correct.
    command.upgrade(Config("alembic.ini"), "head")


@pytest.fixture(autouse=True)
def clean_tables(database: None, settings: Settings) -> None:
    asyncio.run(_truncate(settings))


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings)) as test_client:
        yield test_client
