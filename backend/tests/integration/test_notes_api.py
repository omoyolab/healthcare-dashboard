"""Clinical note endpoints, and the summary built from them."""

from fastapi.testclient import TestClient

from tests.factories import note_payload, patient_payload

UNKNOWN = "00000000-0000-0000-0000-000000000000"


def make_patient(client: TestClient, **overrides: object) -> str:
    response = client.post("/api/v1/patients", json=patient_payload(**overrides))
    assert response.status_code == 201, response.text
    return str(response.json()["id"])


def test_add_note_defaults_authored_at_to_now(client: TestClient) -> None:
    patient_id = make_patient(client)

    response = client.post(f"/api/v1/patients/{patient_id}/notes", json=note_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["patient_id"] == patient_id
    assert body["authored_at"]


def test_notes_come_back_newest_first(client: TestClient) -> None:
    patient_id = make_patient(client)
    for day, text in [("01", "oldest"), ("15", "middle"), ("28", "newest")]:
        client.post(
            f"/api/v1/patients/{patient_id}/notes",
            json=note_payload(content=text, authored_at=f"2026-09-{day}T09:00:00Z"),
        )

    items = client.get(f"/api/v1/patients/{patient_id}/notes").json()["items"]

    assert [item["content"] for item in items] == ["newest", "middle", "oldest"]


def test_blank_content_is_rejected(client: TestClient) -> None:
    patient_id = make_patient(client)

    response = client.post(f"/api/v1/patients/{patient_id}/notes", json={"content": "   "})

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "content"


def test_future_authored_at_is_rejected(client: TestClient) -> None:
    patient_id = make_patient(client)

    response = client.post(
        f"/api/v1/patients/{patient_id}/notes",
        json=note_payload(authored_at="2099-01-01T00:00:00Z"),
    )

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "authored_at"


def test_notes_for_unknown_patient_are_404_not_empty(client: TestClient) -> None:
    assert client.get(f"/api/v1/patients/{UNKNOWN}/notes").status_code == 404
    assert client.post(f"/api/v1/patients/{UNKNOWN}/notes", json=note_payload()).status_code == 404


def test_patient_with_no_notes_gets_an_empty_page(client: TestClient) -> None:
    patient_id = make_patient(client)

    body = client.get(f"/api/v1/patients/{patient_id}/notes").json()

    assert (body["total"], body["items"]) == (0, [])


def test_deleting_a_note_through_the_wrong_patient_is_404(client: TestClient) -> None:
    owner = make_patient(client, email="owner@example.com")
    other = make_patient(client, email="other@example.com", first_name="Other")
    note_id = client.post(f"/api/v1/patients/{owner}/notes", json=note_payload()).json()["id"]

    # 404 rather than 403: a 403 would confirm the note exists to someone who
    # should not know that.
    assert client.delete(f"/api/v1/patients/{other}/notes/{note_id}").status_code == 404
    assert client.delete(f"/api/v1/patients/{owner}/notes/{note_id}").status_code == 204
    assert client.get(f"/api/v1/patients/{owner}/notes").json()["total"] == 0


def test_summary_without_notes_says_so(client: TestClient) -> None:
    patient_id = make_patient(client, conditions=[], allergies=[], blood_type=None)

    body = client.get(f"/api/v1/patients/{patient_id}/summary").json()

    assert body["note_count"] == 0
    assert "No clinical notes are on file yet." in body["narrative"]
    assert body["generated_by"] == "template"


def test_summary_reflects_notes_and_updates_when_one_is_added(client: TestClient) -> None:
    patient_id = make_patient(client, conditions=["asthma"], allergies=["pollen"])
    client.post(
        f"/api/v1/patients/{patient_id}/notes",
        json=note_payload(content="Peak flow normal.", authored_at="2026-09-01T09:00:00Z"),
    )

    first = client.get(f"/api/v1/patients/{patient_id}/summary").json()
    assert first["note_count"] == 1
    assert "Peak flow normal." in first["narrative"]

    client.post(
        f"/api/v1/patients/{patient_id}/notes",
        json=note_payload(content="Reports a flare.", authored_at="2026-09-20T09:00:00Z"),
    )
    second = client.get(f"/api/v1/patients/{patient_id}/summary").json()

    assert second["note_count"] == 2
    assert "Reports a flare." in second["narrative"]
    assert "Care is ongoing for asthma." in second["narrative"]


def test_summary_for_unknown_patient_is_404(client: TestClient) -> None:
    assert client.get(f"/api/v1/patients/{UNKNOWN}/summary").status_code == 404
