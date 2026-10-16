"""Clinical note persistence. Always scoped by patient."""

import uuid
from collections.abc import Sequence

from sqlalchemy import func, select

from app.core.pagination import PageRequest
from app.models.note import ClinicalNote
from app.repositories.base import BaseRepository


class NoteRepository(BaseRepository[ClinicalNote]):
    model = ClinicalNote

    async def list_for_patient(
        self, patient_id: uuid.UUID, page: PageRequest
    ) -> tuple[Sequence[ClinicalNote], int]:
        total = func.count().over().label("total")
        stmt = (
            select(ClinicalNote, total)
            .where(ClinicalNote.patient_id == patient_id)
            .order_by(ClinicalNote.authored_at.desc(), ClinicalNote.id)
            .offset(page.offset)
            .limit(page.limit)
        )
        rows = (await self._session.execute(stmt)).all()
        if not rows:
            return [], 0
        return [row[0] for row in rows], int(rows[0].total)

    async def get_for_patient(
        self, patient_id: uuid.UUID, note_id: uuid.UUID
    ) -> ClinicalNote | None:
        # Scoped by patient_id so a note belonging to someone else is simply
        # not found, rather than 403 confirming it exists.
        stmt = select(ClinicalNote).where(
            ClinicalNote.id == note_id, ClinicalNote.patient_id == patient_id
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()
