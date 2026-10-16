"""Patient routes. Validate, delegate, declare status codes - nothing else."""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Query, Request, Response, status

from app.api.deps import PatientServiceDep
from app.schemas.common import Page, ProblemDetail
from app.schemas.patient import PatientListItem, PatientListQuery, PatientRead, PatientWrite
from app.schemas.stats import PatientStats

router = APIRouter(prefix="/patients", tags=["patients"])

Responses = dict[int | str, dict[str, Any]]

NOT_FOUND: Responses = {404: {"model": ProblemDetail, "description": "Patient does not exist"}}
CONFLICT: Responses = {409: {"model": ProblemDetail, "description": "Email already in use"}}


@router.get("", summary="List patients")
async def list_patients(
    service: PatientServiceDep,
    query: Annotated[PatientListQuery, Query()],
) -> Page[PatientListItem]:
    return await service.list_patients(query)


@router.post(
    "", status_code=status.HTTP_201_CREATED, responses=CONFLICT, summary="Create a patient"
)
async def create_patient(
    payload: PatientWrite,
    service: PatientServiceDep,
    request: Request,
    response: Response,
) -> PatientRead:
    patient = await service.create_patient(payload)
    response.headers["Location"] = str(request.url_for("get_patient", patient_id=patient.id))
    return patient


@router.get("/stats", summary="Dashboard counts")
async def get_stats(service: PatientServiceDep) -> PatientStats:
    # Declared before /{patient_id}: otherwise "stats" is matched as an id.
    return await service.get_stats()


@router.get("/{patient_id}", responses=NOT_FOUND, summary="Get a patient")
async def get_patient(patient_id: uuid.UUID, service: PatientServiceDep) -> PatientRead:
    return await service.get_patient(patient_id)


@router.put(
    "/{patient_id}",
    responses=NOT_FOUND | CONFLICT,
    summary="Replace a patient",
)
async def replace_patient(
    patient_id: uuid.UUID, payload: PatientWrite, service: PatientServiceDep
) -> PatientRead:
    return await service.replace_patient(patient_id, payload)


@router.delete(
    "/{patient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=NOT_FOUND,
    summary="Delete a patient",
)
async def delete_patient(patient_id: uuid.UUID, service: PatientServiceDep) -> None:
    await service.delete_patient(patient_id)
