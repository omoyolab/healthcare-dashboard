"""Generated patient summary contract."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models.patient import BloodType


class PatientSummary(BaseModel):
    patient_id: uuid.UUID
    name: str
    age: int
    blood_type: BloodType | None
    narrative: str
    conditions: list[str]
    allergies: list[str]
    note_count: int
    # Surfaced so the UI can be honest with a clinician about what wrote this.
    generated_by: Literal["template"]
    generated_at: datetime
