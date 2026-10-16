"""Model package. Importing every model here is what registers them on
Base.metadata, so Alembic autogenerate can see the full schema."""

from app.models.note import ClinicalNote
from app.models.patient import BloodType, Patient, PatientStatus

__all__ = ["BloodType", "ClinicalNote", "Patient", "PatientStatus"]
