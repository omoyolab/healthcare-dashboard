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


def build_narrative(
    patient: Patient, notes: list[ClinicalNote], age: int, total_notes: int | None = None
) -> list[str]:
    """Short paragraphs rather than one block of text.

    total_notes is the number on file, which can exceed the notes passed in:
    only the most recent NARRATED_NOTES are read, and the wording has to say so
    rather than implying the dates cover everything.
    """
    name = f"{patient.first_name} {patient.last_name}"
    blood = f", blood type {patient.blood_type.value}" if patient.blood_type else ""

    who = f"{name} is a {age}-year-old patient{blood}, currently {patient.status.value}."
    if patient.conditions:
        who += f" Care is ongoing for {_format_list(patient.conditions)}."
    if patient.allergies:
        who += f" Allergies are recorded for {_format_list(patient.allergies)}."
    paragraphs = [who]

    if not notes:
        paragraphs.append("No clinical notes are on file yet.")
        return paragraphs

    # Notes arrive newest first.
    newest, oldest = notes[0], notes[-1]
    on_file = total_notes if total_notes is not None else len(notes)
    span = (
        f"{oldest.authored_at.strftime(DATE_FORMAT)} to {newest.authored_at.strftime(DATE_FORMAT)}"
    )

    if on_file == 1:
        paragraphs.append(
            f"One clinical note is on file, written {newest.authored_at.strftime(DATE_FORMAT)}."
        )
    elif on_file > len(notes):
        # Only the most recent were read, so the dates describe those, not all.
        paragraphs.append(
            f"{on_file} clinical notes are on file. The {len(notes)} most recent span {span}."
        )
    else:
        paragraphs.append(f"{on_file} clinical notes are on file, spanning {span}.")

    # Its own line: when the patient was seen is a separate fact from how many
    # notes exist.
    paragraphs.append(
        f"The patient was last seen {patient.last_visit_at.strftime(DATE_FORMAT)}."
        if patient.last_visit_at
        else "No visit has been recorded."
    )

    paragraphs.append(
        f"Most recent note, {newest.authored_at.strftime(DATE_FORMAT)}: {newest.content}"
    )
    return paragraphs


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
            narrative=build_narrative(patient, list(notes), age, total),
            conditions=list(patient.conditions),
            allergies=list(patient.allergies),
            note_count=total,
            generated_by="template",
            generated_at=datetime.now(UTC),
        )
