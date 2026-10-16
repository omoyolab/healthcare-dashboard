"""Patient table and its enums."""

from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Index,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.note import ClinicalNote


class PatientStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCHARGED = "discharged"


class BloodType(StrEnum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"


# SQLAlchemy stores enum *names* by default, which would put "A_POSITIVE" in the
# column instead of "A+".
def _enum_values(enum_class: type[StrEnum]) -> list[str]:
    return [member.value for member in enum_class]


class Patient(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "patients"

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    # Age is derived on read; a stored age is wrong the next day.
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)

    # citext makes uniqueness case-insensitive at the column level, so no query
    # can bypass it by forgetting lower().
    email: Mapped[str | None] = mapped_column(CITEXT, unique=True)
    phone: Mapped[str | None] = mapped_column(String(32))

    address_line1: Mapped[str | None] = mapped_column(String(200))
    address_line2: Mapped[str | None] = mapped_column(String(200))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    postal_code: Mapped[str | None] = mapped_column(String(20))

    blood_type: Mapped[BloodType | None] = mapped_column(
        Enum(BloodType, name="blood_type", values_callable=_enum_values)
    )
    # Empty array means "none recorded"; nullable collections make every caller
    # handle null and empty separately.
    allergies: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default=text("'{}'::text[]"), default=list
    )
    conditions: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default=text("'{}'::text[]"), default=list
    )

    status: Mapped[PatientStatus] = mapped_column(
        Enum(PatientStatus, name="patient_status", values_callable=_enum_values),
        nullable=False,
        server_default=PatientStatus.ACTIVE.value,
        default=PatientStatus.ACTIVE,
    )
    last_visit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    notes: Mapped[list[ClinicalNote]] = relationship(
        back_populates="patient",
        cascade="all, delete-orphan",
        # Let the database cascade handle deletes instead of loading every note
        # into memory to delete it row by row.
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint("length(btrim(first_name)) > 0", name="first_name_not_blank"),
        CheckConstraint("length(btrim(last_name)) > 0", name="last_name_not_blank"),
        CheckConstraint("date_of_birth < current_date", name="dob_in_past"),
        Index("ix_patients_last_name_first_name", "last_name", "first_name"),
        Index("ix_patients_status", "status"),
        Index("ix_patients_last_visit_at", "last_visit_at"),
    )
