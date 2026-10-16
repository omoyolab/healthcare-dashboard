"""Patient API contracts: the list query, and the read models."""

import uuid
from datetime import UTC, date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator

from app.core.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PageRequest
from app.models.patient import BloodType, PatientStatus


class PatientSortField(StrEnum):
    LAST_NAME = "last_name"
    FIRST_NAME = "first_name"
    DATE_OF_BIRTH = "date_of_birth"
    LAST_VISIT_AT = "last_visit_at"
    CREATED_AT = "created_at"


class PatientListQuery(BaseModel):
    """Query parameters for GET /patients.

    extra="forbid" so a mistyped parameter is a 422 rather than silently ignored.
    """

    model_config = ConfigDict(extra="forbid")

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)
    q: str | None = Field(default=None, min_length=1, max_length=100)
    status: list[PatientStatus] = Field(default_factory=list)
    sort: str = Field(
        default=PatientSortField.LAST_NAME.value,
        description="Allow-listed field, '-' prefix for descending (e.g. -last_visit_at)",
    )

    @field_validator("sort")
    @classmethod
    def _validate_sort(cls, value: str) -> str:
        # Validated against an enum rather than interpolated into SQL, and an
        # unknown field is a 422 instead of a silent fallback.
        field = value.removeprefix("-")
        if field not in set(PatientSortField):
            allowed = ", ".join(sorted(PatientSortField))
            raise ValueError(f"unsupported sort field '{field}'; allowed: {allowed}")
        return value

    @property
    def sort_field(self) -> PatientSortField:
        return PatientSortField(self.sort.removeprefix("-"))

    @property
    def descending(self) -> bool:
        return self.sort.startswith("-")

    @property
    def page_request(self) -> PageRequest:
        return PageRequest(page=self.page, page_size=self.page_size)


def calculate_age(date_of_birth: date, today: date | None = None) -> int:
    """Age is derived, never stored - a stored age is wrong the next day."""
    reference = today or datetime.now(UTC).date()
    had_birthday = (reference.month, reference.day) >= (
        date_of_birth.month,
        date_of_birth.day,
    )
    return reference.year - date_of_birth.year - (0 if had_birthday else 1)


class PatientBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str
    date_of_birth: date
    status: PatientStatus
    last_visit_at: datetime | None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def age(self) -> int:
        return calculate_age(self.date_of_birth)


class PatientListItem(PatientBase):
    """List projection: exactly what the table renders, so the payload stays
    small as the record grows."""


class PatientRead(PatientBase):
    email: str | None
    phone: str | None
    address_line1: str | None
    address_line2: str | None
    city: str | None
    state: str | None
    postal_code: str | None
    blood_type: BloodType | None
    allergies: list[str]
    conditions: list[str]
    created_at: datetime
    updated_at: datetime


MAX_AGE_YEARS = 130


class PatientWrite(BaseModel):
    """Request body for POST and PUT. PUT is a full replacement, same rules.

    This is the authoritative validation; the client's Zod schema mirrors it for
    fast feedback only.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    date_of_birth: date
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    address_line1: str | None = Field(default=None, max_length=200)
    address_line2: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    blood_type: BloodType | None = None
    allergies: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    status: PatientStatus = PatientStatus.ACTIVE

    @field_validator("date_of_birth")
    @classmethod
    def _dob_is_plausible(cls, value: date) -> date:
        today = datetime.now(UTC).date()
        if value >= today:
            raise ValueError("must be in the past")
        if calculate_age(value, today) > MAX_AGE_YEARS:
            raise ValueError(f"implies an age over {MAX_AGE_YEARS} years")
        return value

    @field_validator("allergies", "conditions")
    @classmethod
    def _clean_terms(cls, values: list[str]) -> list[str]:
        # Trim, drop blanks, de-duplicate case-insensitively, keep input order.
        seen: set[str] = set()
        cleaned: list[str] = []
        for raw in values:
            term = raw.strip()
            if term and term.casefold() not in seen:
                seen.add(term.casefold())
                cleaned.append(term)
        return cleaned
