"""Dashboard aggregates."""

from pydantic import BaseModel


class StatusCounts(BaseModel):
    active: int
    inactive: int
    discharged: int


class PatientStats(BaseModel):
    total: int
    by_status: StatusCounts
    never_seen: int
    seen_last_30_days: int
