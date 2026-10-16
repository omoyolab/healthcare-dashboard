"""Builds the human-readable patient summary.

Deterministic template generation: no network, no key, unit-testable, and it
cannot invent a clinical fact that is not in the record.
"""

import uuid
from datetime import UTC, datetime

from app.core.errors import PatientNotFoundError
from app.core.pagination import PageRequest
from app.models.note import ClinicalNote
from app.models.patient import Patient
from app.repositories.note_repository import NoteRepository
from app.repositories.patient_repository import PatientRepository
from app.schemas.patient import calculate_age
from app.schemas.summary import PatientSummary

# Enough to characterise the history without turning the summary into a dump.
NARRATED_NOTES = 50
DATE_FORMAT = "%d %b %Y"


def _format_list(items: list[str]) -> str:
    if len(items) == 1:
        return items[0]
    return f"{', '.join(items[:-1])} and {items[-1]}"


def build_narrative(patient: Patient, notes: list[ClinicalNote], age: int) -> str:
    name = f"{patient.first_name} {patient.last_name}"
    blood = f" with blood type {patient.blood_type.value}" if patient.blood_type else ""
    parts = [f"{name} is a {age}-year-old patient{blood}, currently {patient.status.value}."]

    if patient.conditions:
        parts.append(f"Care is ongoing for {_format_list(patient.conditions)}.")
    else:
        parts.append("No ongoing conditions are recorded.")

    parts.append(
        f"Documented allergies: {_format_list(patient.allergies)}."
        if patient.allergies
        else "No known allergies are recorded."
    )

    if not notes:
        parts.append("No clinical notes are on file yet.")
        return " ".join(parts)

    # Notes arrive newest first.
    newest, oldest = notes[0], notes[-1]
    if len(notes) == 1:
        parts.append(
            f"A single clinical note from {newest.authored_at.strftime(DATE_FORMAT)} reports: "
            f"{newest.content}"
        )
    else:
        parts.append(
            f"Across {len(notes)} clinical notes between "
            f"{oldest.authored_at.strftime(DATE_FORMAT)} and "
            f"{newest.authored_at.strftime(DATE_FORMAT)}, the most recent entry reports: "
            f"{newest.content}"
        )

    if patient.last_visit_at:
        parts.append(f"Last seen {patient.last_visit_at.strftime(DATE_FORMAT)}.")
    else:
        parts.append("No visit has been recorded.")

    return " ".join(parts)


class SummaryService:
    def __init__(self, patients: PatientRepository, notes: NoteRepository) -> None:
        self._patients = patients
        self._notes = notes

    async def summarise(self, patient_id: uuid.UUID) -> PatientSummary:
        patient = await self._patients.get(patient_id)
        if patient is None:
            raise PatientNotFoundError(patient_id)

        notes, total = await self._notes.list_for_patient(
            patient_id, PageRequest(page=1, page_size=NARRATED_NOTES)
        )
        age = calculate_age(patient.date_of_birth)
        return PatientSummary(
            patient_id=patient.id,
            name=f"{patient.first_name} {patient.last_name}",
            age=age,
            blood_type=patient.blood_type,
            narrative=build_narrative(patient, list(notes), age),
            conditions=list(patient.conditions),
            allergies=list(patient.allergies),
            note_count=total,
            generated_by="template",
            generated_at=datetime.now(UTC),
        )
