"""Patient use cases. No HTTP, no SQL."""

import uuid

from app.core.errors import PatientNotFoundError
from app.models.patient import Patient
from app.repositories.patient_repository import PatientRepository
from app.schemas.common import Page
from app.schemas.patient import PatientListItem, PatientListQuery, PatientRead, PatientWrite
from app.schemas.stats import PatientStats, StatusCounts


class PatientService:
    def __init__(self, patients: PatientRepository) -> None:
        self._patients = patients

    async def list_patients(self, query: PatientListQuery) -> Page[PatientListItem]:
        rows, total = await self._patients.list_page(query)
        items = [PatientListItem.model_validate(row) for row in rows]
        return Page.build(items, total, query.page_request)

    async def get_stats(self) -> PatientStats:
        counts = await self._patients.stats()
        return PatientStats(
            total=counts["total"],
            by_status=StatusCounts(
                active=counts["active"],
                inactive=counts["inactive"],
                discharged=counts["discharged"],
            ),
            never_seen=counts["never_seen"],
            seen_last_30_days=counts["seen_last_30_days"],
        )

    async def get_patient(self, patient_id: uuid.UUID) -> PatientRead:
        return PatientRead.model_validate(await self._require(patient_id))

    async def create_patient(self, payload: PatientWrite) -> PatientRead:
        patient = Patient(**payload.model_dump())
        self._patients.add(patient)
        await self._patients.persist(patient)
        return PatientRead.model_validate(patient)

    async def replace_patient(self, patient_id: uuid.UUID, payload: PatientWrite) -> PatientRead:
        patient = await self._require(patient_id)
        for field, value in payload.model_dump().items():
            setattr(patient, field, value)
        await self._patients.persist(patient)
        return PatientRead.model_validate(patient)

    async def delete_patient(self, patient_id: uuid.UUID) -> None:
        # Notes go with the patient via the FK cascade.
        await self._patients.delete(await self._require(patient_id))

    async def _require(self, patient_id: uuid.UUID) -> Patient:
        patient = await self._patients.get(patient_id)
        if patient is None:
            raise PatientNotFoundError(patient_id)
        return patient
