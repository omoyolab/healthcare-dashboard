"""Clinical note use cases."""

import uuid

from app.core.errors import NoteNotFoundError, PatientNotFoundError
from app.core.pagination import PageRequest
from app.models.note import ClinicalNote
from app.repositories.note_repository import NoteRepository
from app.repositories.patient_repository import PatientRepository
from app.schemas.common import Page
from app.schemas.note import NoteCreate, NoteRead


class NoteService:
    def __init__(self, notes: NoteRepository, patients: PatientRepository) -> None:
        self._notes = notes
        self._patients = patients

    async def list_notes(self, patient_id: uuid.UUID, page: PageRequest) -> Page[NoteRead]:
        await self._require_patient(patient_id)
        rows, total = await self._notes.list_for_patient(patient_id, page)
        return Page.build([NoteRead.model_validate(row) for row in rows], total, page)

    async def add_note(self, patient_id: uuid.UUID, payload: NoteCreate) -> NoteRead:
        await self._require_patient(patient_id)
        note = ClinicalNote(patient_id=patient_id, **payload.model_dump())
        self._notes.add(note)
        await self._notes.persist(note)
        return NoteRead.model_validate(note)

    async def delete_note(self, patient_id: uuid.UUID, note_id: uuid.UUID) -> None:
        await self._require_patient(patient_id)
        note = await self._notes.get_for_patient(patient_id, note_id)
        if note is None:
            raise NoteNotFoundError(note_id)
        await self._notes.delete(note)

    async def _require_patient(self, patient_id: uuid.UUID) -> None:
        # Checked first so an unknown patient is a 404, not a foreign-key 500.
        if await self._patients.get(patient_id) is None:
            raise PatientNotFoundError(patient_id)
