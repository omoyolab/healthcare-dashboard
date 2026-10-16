"""Generic async repository.

Keeps SQLAlchemy out of the service layer, which is what lets services be
unit-tested against a fake.
"""

import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base


def violated_constraint(exc: IntegrityError) -> str:
    """Find the constraint name in the driver exception chain.

    exc.orig is SQLAlchemy's DBAPI wrapper; the asyncpg error carrying
    constraint_name sits below it, so the chain has to be walked.
    """
    error: BaseException | None = exc.orig
    while error is not None:
        name = getattr(error, "constraint_name", None)
        if name:
            return str(name)
        error = error.__cause__
    return ""


class BaseRepository[ModelT: Base]:
    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, entity_id: uuid.UUID) -> ModelT | None:
        return await self._session.get(self.model, entity_id)

    def add(self, entity: ModelT) -> ModelT:
        # No commit here: the session dependency owns the transaction boundary.
        self._session.add(entity)
        return entity

    async def delete(self, entity: ModelT) -> None:
        await self._session.delete(entity)

    async def persist(self, entity: ModelT) -> ModelT:
        """Flush so database constraints speak now, then load server defaults.

        Subclasses override _translate to turn a constraint violation into a
        domain error; anything unrecognised propagates as a 500.
        """
        try:
            await self._session.flush()
        except IntegrityError as exc:
            self._translate(exc, entity)
            raise
        # Explicit refresh: in async, touching an expired attribute later would
        # raise MissingGreenlet instead of quietly re-selecting.
        await self._session.refresh(entity)
        return entity

    def _translate(self, exc: IntegrityError, entity: ModelT) -> None:
        """Hook for mapping constraint names to domain errors."""
