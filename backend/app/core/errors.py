"""Domain exceptions.

Deliberately HTTP-unaware: services raise these, and only
core/exception_handlers.py decides what status code each becomes.
"""

import uuid


class DomainError(Exception):
    """Base for failures the API reports back to the caller."""

    title = "Request could not be completed"

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class NotFoundError(DomainError):
    title = "Resource not found"


class ServiceUnavailableError(DomainError):
    title = "Service unavailable"


class ConflictError(DomainError):
    title = "Conflict with an existing resource"


class PatientNotFoundError(NotFoundError):
    title = "Patient not found"

    def __init__(self, patient_id: uuid.UUID) -> None:
        super().__init__(f"No patient with id {patient_id}")


class DuplicatePatientEmailError(ConflictError):
    title = "Email already in use"

    def __init__(self, email: str) -> None:
        super().__init__(f"Another patient already uses {email}")


class NoteNotFoundError(NotFoundError):
    title = "Note not found"

    def __init__(self, note_id: uuid.UUID) -> None:
        super().__init__(f"No note with id {note_id} for this patient")
