"""Clinical note table."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.patient import Patient


class ClinicalNote(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "clinical_notes"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
    )
    # When the note was written clinically, which can predate the row: a
    # clinician may record an earlier encounter. created_at is the row's age.
    authored_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    patient: Mapped[Patient] = relationship(back_populates="notes")

    __table_args__ = (
        CheckConstraint("length(btrim(content)) between 1 and 5000", name="content_length"),
        # The only read pattern: one patient's notes, newest first. Postgres can
        # scan a btree backwards, so this covers the DESC sort too.
        Index("ix_clinical_notes_patient_id_authored_at", "patient_id", "authored_at"),
    )
