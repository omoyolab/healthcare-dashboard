"""Clinical note contracts."""

import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_CONTENT_LENGTH = 5000


class NoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    content: str = Field(min_length=1, max_length=MAX_CONTENT_LENGTH)
    authored_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @field_validator("authored_at")
    @classmethod
    def _not_in_future(cls, value: datetime) -> datetime:
        # A note about an earlier encounter is normal; one about the future is not.
        if value > datetime.now(UTC):
            raise ValueError("cannot be in the future")
        return value


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    authored_at: datetime
    content: str
    created_at: datetime
