"""Builders so each test states only the fields it cares about."""

from typing import Any


def patient_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "first_name": "Ada",
        "last_name": "Lovelace",
        "date_of_birth": "1990-12-10",
        "email": "ada@example.com",
        "phone": "+1-415-555-0100",
        "city": "San Francisco",
        "state": "CA",
        "blood_type": "B+",
        "allergies": ["latex"],
        "conditions": [],
        "status": "active",
    }
    payload.update(overrides)
    return payload


def note_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {"content": "Routine review. No new symptoms."}
    payload.update(overrides)
    return payload
