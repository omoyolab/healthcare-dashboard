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
    # Paragraphs rather than one block of text, so the interface can lay them
    # out. The profile fields below are what the narrative is built from.
    narrative: list[str]
    conditions: list[str]
    allergies: list[str]
    note_count: int
    generated_by: Literal["template"]
    generated_at: datetime
