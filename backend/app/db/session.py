"""Async engine, sessions, and the request-scoped transaction boundary."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Request
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


class Database:
    """Owns the engine and session factory for one application instance."""

    def __init__(
        self,
        dsn: str,
        *,
        echo: bool = False,
        pool_size: int = 5,
        max_overflow: int = 10,
    ) -> None:
        self._engine = create_async_engine(
            dsn,
            echo=echo,
            pool_size=pool_size,
            max_overflow=max_overflow,
            # Discards connections the database closed while idle, instead of
            # failing the first request after a restart.
            pool_pre_ping=True,
        )
        self._sessionmaker = async_sessionmaker(
            self._engine,
            # Keeps loaded attributes readable after commit, so a route can
            # still serialise the object it just saved.
            expire_on_commit=False,
            autoflush=False,
        )

    @property
    def engine(self) -> AsyncEngine:
        return self._engine

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        session = self._sessionmaker()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def dispose(self) -> None:
        await self._engine.dispose()


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    """Dependency owning commit/rollback, so services never manage transactions."""
    database: Database = request.app.state.db
    async with database.session() as session:
        yield session
