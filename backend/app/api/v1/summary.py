"""Generated summary route."""

import uuid
from typing import Any

from fastapi import APIRouter

from app.api.deps import SummaryServiceDep
from app.schemas.common import ProblemDetail
from app.schemas.summary import PatientSummary

router = APIRouter(prefix="/patients/{patient_id}/summary", tags=["summary"])

NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {"model": ProblemDetail, "description": "Patient does not exist"}
}


@router.get("", responses=NOT_FOUND, summary="Generated patient summary")
async def get_summary(patient_id: uuid.UUID, service: SummaryServiceDep) -> PatientSummary:
    return await service.summarise(patient_id)
