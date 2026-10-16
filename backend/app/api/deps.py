"""Dependency wiring. The only place that knows how the layers connect."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.repositories.note_repository import NoteRepository
from app.repositories.patient_repository import PatientRepository
from app.services.note_service import NoteService
from app.services.patient_service import PatientService
from app.services.summary_service import SummaryService

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_patient_service(session: SessionDep) -> PatientService:
    return PatientService(PatientRepository(session))


PatientServiceDep = Annotated[PatientService, Depends(get_patient_service)]


def get_note_service(session: SessionDep) -> NoteService:
    return NoteService(NoteRepository(session), PatientRepository(session))


NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]


def get_summary_service(session: SessionDep) -> SummaryService:
    return SummaryService(PatientRepository(session), NoteRepository(session))


SummaryServiceDep = Annotated[SummaryService, Depends(get_summary_service)]
