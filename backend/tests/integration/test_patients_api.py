"""Patient endpoints against a real database."""

from typing import Any

from fastapi.testclient import TestClient

from tests.factories import patient_payload


def create(client: TestClient, **overrides: object) -> dict[str, Any]:
    response = client.post("/api/v1/patients", json=patient_payload(**overrides))
    assert response.status_code == 201, response.text
    body: dict[str, Any] = response.json()
    return body


def test_create_returns_201_with_location_and_derived_age(client: TestClient) -> None:
    response = client.post("/api/v1/patients", json=patient_payload())

    assert response.status_code == 201
    body = response.json()
    assert response.headers["location"].endswith(f"/patients/{body['id']}")
    assert body["age"] == 35
    assert body["blood_type"] == "B+"


def test_create_normalises_input(client: TestClient) -> None:
    body = create(
        client,
        first_name="  Ada  ",
        allergies=["  Latex ", "latex", "", "Penicillin"],
    )

    assert body["first_name"] == "Ada"
    assert body["allergies"] == ["Latex", "Penicillin"]


def test_duplicate_email_is_409_regardless_of_case(client: TestClient) -> None:
    create(client, email="ada@example.com")

    response = client.post(
        "/api/v1/patients", json=patient_payload(email="ADA@EXAMPLE.com", first_name="Other")
    )

    assert response.status_code == 409
    assert response.json()["type"] == "/errors/conflict"


def test_invalid_body_returns_field_level_errors(client: TestClient) -> None:
    response = client.post(
        "/api/v1/patients",
        json=patient_payload(
            first_name="", date_of_birth="2099-01-01", email="nope", blood_type="Z+"
        ),
    )

    assert response.status_code == 422
    fields = {error["field"] for error in response.json()["errors"]}
    assert {"first_name", "date_of_birth", "email", "blood_type"} <= fields


def test_unknown_query_parameter_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/patients", params={"statuss": "active"})

    assert response.status_code == 422


def test_get_unknown_patient_is_404_problem_json(client: TestClient) -> None:
    response = client.get("/api/v1/patients/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    body = response.json()
    assert body["type"] == "/errors/not-found"
    assert body["request_id"]


def test_list_paginates_and_reports_totals(client: TestClient) -> None:
    for index in range(5):
        create(client, email=f"p{index}@example.com", last_name=f"Name{index}")

    response = client.get("/api/v1/patients", params={"page": 2, "page_size": 2})

    body = response.json()
    assert (body["total"], body["total_pages"], len(body["items"])) == (5, 3, 2)
    assert (body["has_next"], body["has_previous"]) == (True, True)


def test_page_size_over_maximum_is_rejected_not_clamped(client: TestClient) -> None:
    assert client.get("/api/v1/patients", params={"page_size": 500}).status_code == 422


def test_search_matches_name_and_email(client: TestClient) -> None:
    create(client, first_name="Rosa", last_name="Delgado", email="rosa@example.com")
    create(client, first_name="Marco", last_name="Rodriguez", email="marco@example.com")
    create(client, first_name="Mei", last_name="Tanaka", email="mei@example.com")

    by_name = client.get("/api/v1/patients", params={"q": "ro"}).json()
    by_email = client.get("/api/v1/patients", params={"q": "mei@example"}).json()

    assert {item["last_name"] for item in by_name["items"]} == {"Delgado", "Rodriguez"}
    assert by_email["total"] == 1


def test_sort_descending_puts_nulls_last(client: TestClient) -> None:
    create(client, last_name="Aaa", email="a@example.com", date_of_birth="1950-01-01")
    create(client, last_name="Bbb", email="b@example.com", date_of_birth="2000-01-01")

    items = client.get("/api/v1/patients", params={"sort": "-date_of_birth"}).json()["items"]

    assert [item["last_name"] for item in items] == ["Bbb", "Aaa"]


def test_unsupported_sort_field_is_422(client: TestClient) -> None:
    response = client.get("/api/v1/patients", params={"sort": "ssn"})

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "sort"


def test_status_filter_accepts_several_values(client: TestClient) -> None:
    create(client, email="a@example.com", status="active")
    create(client, email="b@example.com", status="inactive")
    create(client, email="c@example.com", status="discharged")

    body = client.get(
        "/api/v1/patients", params=[("status", "inactive"), ("status", "discharged")]
    ).json()

    assert body["total"] == 2


def test_put_replaces_every_field(client: TestClient) -> None:
    created = create(client)

    response = client.put(
        f"/api/v1/patients/{created['id']}",
        json={
            "first_name": "Ada",
            "last_name": "Byron",
            "date_of_birth": "1990-12-10",
            "status": "discharged",
            "conditions": ["anaemia"],
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["last_name"] == "Byron"
    assert body["status"] == "discharged"
    # Omitted fields are cleared: PUT is a replacement, not a merge.
    assert body["email"] is None
    assert body["blood_type"] is None


def test_put_unknown_patient_is_404(client: TestClient) -> None:
    response = client.put(
        "/api/v1/patients/00000000-0000-0000-0000-000000000000", json=patient_payload()
    )

    assert response.status_code == 404


def test_delete_removes_patient_and_their_notes(client: TestClient) -> None:
    created = create(client)
    client.post(f"/api/v1/patients/{created['id']}/notes", json={"content": "A note."})

    assert client.delete(f"/api/v1/patients/{created['id']}").status_code == 204
    assert client.get(f"/api/v1/patients/{created['id']}").status_code == 404
    assert client.get(f"/api/v1/patients/{created['id']}/notes").status_code == 404
    assert client.delete(f"/api/v1/patients/{created['id']}").status_code == 404


def test_implausible_age_is_rejected(client: TestClient) -> None:
    response = client.post("/api/v1/patients", json=patient_payload(date_of_birth="1850-01-01"))

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "date_of_birth"


def test_stats_counts_by_status_and_visits(client: TestClient) -> None:
    create(client, email="a@example.com", status="active")
    create(client, email="b@example.com", status="inactive")
    create(client, email="c@example.com", status="discharged")

    body = client.get("/api/v1/patients/stats").json()

    assert body["total"] == 3
    assert body["by_status"] == {"active": 1, "inactive": 1, "discharged": 1}
    # The form cannot set last_visit_at, so every created patient is unseen.
    assert body["never_seen"] == 3
    assert body["seen_last_30_days"] == 0


def test_stats_route_is_not_parsed_as_a_patient_id(client: TestClient) -> None:
    # Ordering bug guard: /patients/stats must not hit /patients/{patient_id}.
    assert client.get("/api/v1/patients/stats").status_code == 200


def test_page_beyond_the_last_still_reports_the_total(client: TestClient) -> None:
    for index in range(3):
        create(client, email=f"p{index}@example.com", last_name=f"Name{index}")

    body = client.get("/api/v1/patients", params={"page": 99, "page_size": 2}).json()

    # The window count comes back with the rows, so an empty page used to
    # report a total of zero while earlier pages held matches.
    assert body["items"] == []
    assert body["total"] == 3
    assert body["total_pages"] == 2
    assert body["has_previous"] is True
    assert body["has_next"] is False


def test_out_of_range_page_respects_the_filters(client: TestClient) -> None:
    create(client, email="a@example.com", status="active")
    create(client, email="b@example.com", status="inactive")

    body = client.get("/api/v1/patients", params={"page": 50, "status": "active"}).json()

    assert body["items"] == []
    assert body["total"] == 1


def test_out_of_range_search_page_counts_only_matches(client: TestClient) -> None:
    create(client, first_name="Rosa", last_name="Delgado", email="r@example.com")
    create(client, first_name="Mei", last_name="Tanaka", email="m@example.com")

    body = client.get("/api/v1/patients", params={"page": 9, "q": "delgado"}).json()

    assert body["total"] == 1
