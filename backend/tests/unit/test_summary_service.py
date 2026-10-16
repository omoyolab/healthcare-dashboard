"""Narrative generation. Pure logic: no database, no network."""

from datetime import UTC, date, datetime

from app.models.note import ClinicalNote
from app.models.patient import BloodType, Patient, PatientStatus
from app.services.summary_service import build_narrative


def make_patient(**overrides: object) -> Patient:
    values: dict[str, object] = {
        "first_name": "Rosa",
        "last_name": "Delgado",
        "date_of_birth": date(1981, 3, 14),
        "status": PatientStatus.ACTIVE,
        "blood_type": BloodType.O_POSITIVE,
        "allergies": ["penicillin", "latex"],
        "conditions": ["type 2 diabetes"],
        "last_visit_at": datetime(2026, 9, 28, tzinfo=UTC),
    }
    values.update(overrides)
    return Patient(**values)


def make_note(day: int, content: str) -> ClinicalNote:
    return ClinicalNote(authored_at=datetime(2026, 9, day, tzinfo=UTC), content=content)


def test_includes_identifiers_conditions_and_allergies() -> None:
    narrative = build_narrative(make_patient(), [], age=45)

    assert "Rosa Delgado is a 45-year-old patient with blood type O+" in narrative
    assert "currently active" in narrative
    assert "Care is ongoing for type 2 diabetes." in narrative
    assert "Documented allergies: penicillin and latex." in narrative


def test_states_plainly_when_there_are_no_notes() -> None:
    narrative = build_narrative(make_patient(), [], age=45)

    assert "No clinical notes are on file yet." in narrative


def test_single_note_reads_as_one_note() -> None:
    narrative = build_narrative(make_patient(), [make_note(28, "Reports improvement.")], age=45)

    assert "A single clinical note from 28 Sep 2026 reports: Reports improvement." in narrative


def test_many_notes_summarise_range_and_quote_the_newest() -> None:
    notes = [make_note(28, "Newest entry."), make_note(14, "Middle."), make_note(2, "Oldest.")]

    narrative = build_narrative(make_patient(), notes, age=45)

    assert "Across 3 clinical notes between 02 Sep 2026 and 28 Sep 2026" in narrative
    assert "the most recent entry reports: Newest entry." in narrative
    assert "Oldest." not in narrative


def test_missing_optional_fields_do_not_produce_gaps() -> None:
    patient = make_patient(blood_type=None, allergies=[], conditions=[], last_visit_at=None)

    narrative = build_narrative(patient, [], age=45)

    assert "blood type" not in narrative
    assert "No ongoing conditions are recorded." in narrative
    assert "No known allergies are recorded." in narrative
    assert "None" not in narrative


def test_single_item_lists_are_not_comma_joined() -> None:
    patient = make_patient(allergies=["latex"], conditions=["asthma"])

    narrative = build_narrative(patient, [], age=30)

    assert "Documented allergies: latex." in narrative
    assert "Care is ongoing for asthma." in narrative


def test_last_visit_is_reported_when_present() -> None:
    narrative = build_narrative(make_patient(), [make_note(28, "Seen.")], age=45)

    assert "Last seen 28 Sep 2026." in narrative
