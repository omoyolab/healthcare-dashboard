"""Clinical note routes, nested under the patient that owns them."""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Query, status

from app.api.deps import NoteServiceDep
from app.core.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PageRequest
from app.schemas.common import Page, ProblemDetail
from app.schemas.note import NoteCreate, NoteRead

router = APIRouter(prefix="/patients/{patient_id}/notes", tags=["notes"])

NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {"model": ProblemDetail, "description": "Patient or note does not exist"}
}


@router.get("", responses=NOT_FOUND, summary="List notes for a patient")
async def list_notes(
    patient_id: uuid.UUID,
    service: NoteServiceDep,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> Page[NoteRead]:
    return await service.list_notes(patient_id, PageRequest(page=page, page_size=page_size))


@router.post("", status_code=status.HTTP_201_CREATED, responses=NOT_FOUND, summary="Add a note")
async def add_note(patient_id: uuid.UUID, payload: NoteCreate, service: NoteServiceDep) -> NoteRead:
    return await service.add_note(patient_id, payload)


@router.delete(
    "/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=NOT_FOUND,
    summary="Delete a note",
)
async def delete_note(patient_id: uuid.UUID, note_id: uuid.UUID, service: NoteServiceDep) -> None:
    await service.delete_note(patient_id, note_id)
