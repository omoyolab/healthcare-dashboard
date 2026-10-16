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


def joined(paragraphs: list[str]) -> str:
    return "\n\n".join(paragraphs)


def test_includes_identifiers_conditions_and_allergies() -> None:
    text = joined(build_narrative(make_patient(), [], age=45))

    assert "Rosa Delgado is a 45-year-old patient, blood type O+" in text
    assert "currently active" in text
    assert "Care is ongoing for type 2 diabetes." in text
    assert "Allergies are recorded for penicillin and latex." in text


def test_narrative_is_split_into_short_paragraphs() -> None:
    notes = [make_note(28, "Newest entry."), make_note(2, "Oldest.")]

    paragraphs = build_narrative(make_patient(), notes, age=45)

    # Who the patient is, the note history, the last visit, the newest note.
    assert len(paragraphs) == 4
    assert all(len(p) < 320 for p in paragraphs)


def test_states_plainly_when_there_are_no_notes() -> None:
    paragraphs = build_narrative(make_patient(), [], age=45)

    assert paragraphs[-1] == "No clinical notes are on file yet."


def test_single_note_reads_as_one_note() -> None:
    text = joined(build_narrative(make_patient(), [make_note(28, "Reports improvement.")], age=45))

    assert "One clinical note is on file, written 28 Sep 2026." in text
    assert "Most recent note, 28 Sep 2026: Reports improvement." in text


def test_many_notes_summarise_range_and_quote_the_newest() -> None:
    notes = [make_note(28, "Newest entry."), make_note(14, "Middle."), make_note(2, "Oldest.")]

    text = joined(build_narrative(make_patient(), notes, age=45))

    assert "3 clinical notes are on file, spanning 02 Sep 2026 to 28 Sep 2026." in text
    assert "Most recent note, 28 Sep 2026: Newest entry." in text
    assert "Oldest." not in text


def test_missing_optional_fields_do_not_produce_gaps() -> None:
    patient = make_patient(blood_type=None, allergies=[], conditions=[], last_visit_at=None)

    text = joined(build_narrative(patient, [], age=45))

    assert "blood type" not in text
    assert "None" not in text
    assert "  " not in text


def test_single_item_lists_are_not_comma_joined() -> None:
    patient = make_patient(allergies=["latex"], conditions=["asthma"])

    text = joined(build_narrative(patient, [], age=30))

    assert "Allergies are recorded for latex." in text
    assert "Care is ongoing for asthma." in text


def test_last_visit_is_its_own_paragraph() -> None:
    paragraphs = build_narrative(make_patient(), [make_note(28, "Seen.")], age=45)

    assert "The patient was last seen 28 Sep 2026." in paragraphs


def test_never_seen_is_stated_rather_than_omitted() -> None:
    patient = make_patient(last_visit_at=None)

    paragraphs = build_narrative(patient, [make_note(28, "Seen.")], age=45)

    assert "No visit has been recorded." in paragraphs


def test_narrative_says_how_many_notes_it_actually_read() -> None:
    # 80 on file, only the 50 most recent fetched: the dates describe those 50.
    notes = [make_note(day, f"note {day}") for day in range(28, 8, -1)]

    text = joined(build_narrative(make_patient(), notes, age=45, total_notes=80))

    assert "80 clinical notes are on file." in text
    assert f"The {len(notes)} most recent span" in text


def test_narrative_omits_the_qualifier_when_it_read_everything() -> None:
    notes = [make_note(28, "newest"), make_note(2, "oldest")]

    text = joined(build_narrative(make_patient(), notes, age=45, total_notes=2))

    assert "2 clinical notes are on file, spanning" in text
    assert "most recent span" not in text
