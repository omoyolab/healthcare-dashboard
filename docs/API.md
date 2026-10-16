# API reference

Base URL `http://localhost:8000`. All resources are under `/api/v1`; `/health` is
unversioned because infrastructure depends on it. Interactive docs: `/docs`.

All request and response bodies are JSON. All timestamps are UTC, ISO 8601 with
an offset. Ids are UUIDv4.

---

## Conventions

### Pagination envelope

Every list endpoint returns the same envelope:

```json
{
  "items": [],
  "total": 20,
  "page": 1,
  "page_size": 25,
  "total_pages": 1,
  "has_next": false,
  "has_previous": false
}
```

Note what is absent: `offset`. Clients navigate by `page` / `has_next`, which
leaves us free to move to keyset pagination later without a breaking change
([ADR 0004](adr/0004-list-query-contract.md)).

### Error body

One shape for every error, following RFC 9457 problem details:

```json
{
  "type": "/errors/not-found",
  "title": "Patient not found",
  "status": 404,
  "detail": "No patient with id 0f8b…",
  "instance": "/api/v1/patients/0f8b…",
  "request_id": "01JB2ZQ4K8"
}
```

Validation failures add a machine-readable `errors` array, which the frontend maps
straight onto form fields:

```json
{
  "type": "/errors/validation-error",
  "title": "Validation failed",
  "status": 422,
  "detail": "2 fields are invalid.",
  "instance": "/api/v1/patients",
  "request_id": "01JB2ZQ4K8",
  "errors": [
    { "field": "date_of_birth", "message": "must be in the past" },
    { "field": "email", "message": "not a valid email address" }
  ]
}
```

`request_id` is echoed in the `X-Request-ID` response header and appears in every
log line for that request.

### Status codes

| Code | When                                                                 |
| ---- | -------------------------------------------------------------------- |
| 200  | Successful read or update                                            |
| 201  | Resource created (`Location` header points at it)                    |
| 204  | Successful delete, no body                                           |
| 400  | Malformed request (unparseable JSON, bad UUID in the path)           |
| 404  | Resource does not exist, or note does not belong to that patient     |
| 409  | Conflicts with an existing resource                                  |
| 422  | Body or query parameters failed validation                           |
| 500  | Unhandled server error. Generic message, with `request_id` for support |

---

## Health

### `GET /health`

Liveness probe. Does not touch the database, so a database blip cannot cause the
container to be restarted as unhealthy.

```json
{ "status": "ok" }
```

### `GET /health/ready`

Readiness probe: runs `SELECT 1`, so it answers "can this instance serve
traffic". Returns **503** (not 500) when the database is unreachable, which is
what tells a load balancer to stop routing here while leaving the process alone.

```json
{ "status": "ready", "database": "ok" }
```

The pair matters: during a database outage liveness stays 200 and readiness
turns 503, so the orchestrator stops sending traffic instead of restart-looping
a process that is working correctly.

---

## Patients

### `GET /api/v1/patients`

| Parameter   | Type    | Default | Notes                                                                            |
| ----------- | ------- | ------- | -------------------------------------------------------------------------------- |
| `page`      | int     | `1`     | ≥ 1                                                                              |
| `page_size` | int     | `25`    | 1–100; above the max → 422 rather than silently clamped                          |
| `q`         | string  | none    | Case-insensitive match on first name, last name, email                           |
| `status`    | enum    | none    | `active` \| `inactive` \| `discharged`; repeatable                               |
| `sort`      | string  | `last_name` | Allow-listed field, `-` prefix for descending: `last_name`, `-last_visit_at`, `date_of_birth`, `created_at` |

Sort fields are validated against an enum, never interpolated into SQL.
An unknown field is a 422, not a 500 and not a silent default.

```
GET /api/v1/patients?page=1&page_size=2&q=ro&sort=-last_visit_at
```

```json
{
  "items": [
    {
      "id": "7c9e…",
      "first_name": "Rosa",
      "last_name": "Delgado",
      "date_of_birth": "1981-03-14",
      "age": 45,
      "status": "active",
      "last_visit_at": "2026-09-28T14:05:00Z"
    }
  ],
  "total": 3,
  "page": 1,
  "page_size": 2,
  "total_pages": 2,
  "has_next": true,
  "has_previous": false
}
```

The list response is a summary projection. It carries what the table renders and
nothing more. Allergies, conditions and address come back only from the detail
endpoint, so the list payload stays small as the record grows.

### `GET /api/v1/patients/stats`

Counts for the dashboard, computed in one statement with Postgres `FILTER`
aggregates rather than one request per status.

```json
{
  "total": 20,
  "by_status": { "active": 17, "inactive": 2, "discharged": 1 },
  "never_seen": 2,
  "seen_last_30_days": 9
}
```

This route is declared before `/patients/{id}`, otherwise "stats" would be
matched as a patient id and return 422.

### `GET /api/v1/patients/{id}`

Full record, notes not included (fetch those separately so the detail view can
load progressively).

```json
{
  "id": "7c9e…",
  "first_name": "Rosa",
  "last_name": "Delgado",
  "date_of_birth": "1981-03-14",
  "age": 45,
  "email": "rosa.delgado@example.com",
  "phone": "+1-415-555-0142",
  "address_line1": "1180 Mission St",
  "address_line2": "Apt 4B",
  "city": "San Francisco",
  "state": "CA",
  "postal_code": "94103",
  "blood_type": "O+",
  "allergies": ["penicillin", "latex"],
  "conditions": ["type 2 diabetes"],
  "status": "active",
  "last_visit_at": "2026-09-28T14:05:00Z",
  "created_at": "2026-01-12T09:00:00Z",
  "updated_at": "2026-09-28T14:05:00Z"
}
```

`age` is computed from `date_of_birth` on read and is not stored, because a
stored age is wrong the next day.

### `POST /api/v1/patients`

Returns **201** with the created record and a `Location` header.

```json
{
  "first_name": "Rosa",
  "last_name": "Delgado",
  "date_of_birth": "1981-03-14",
  "email": "rosa.delgado@example.com",
  "phone": "+1-415-555-0142",
  "address_line1": "1180 Mission St",
  "city": "San Francisco",
  "state": "CA",
  "postal_code": "94103",
  "blood_type": "O+",
  "allergies": ["penicillin"],
  "conditions": [],
  "status": "active"
}
```

| Field           | Rule                                                        |
| --------------- | ----------------------------------------------------------- |
| `first_name`    | required, 1–100 chars, trimmed                              |
| `last_name`     | required, 1–100 chars, trimmed                              |
| `date_of_birth` | required, ISO date, must be in the past, age ≤ 130           |
| `email`         | optional, valid address, unique per patient → 409            |
| `phone`         | optional, E.164-ish                                         |
| `blood_type`    | optional, one of `A+ A- B+ B- AB+ AB- O+ O-`                |
| `allergies`     | optional array of non-empty strings, deduped                |
| `conditions`    | optional array of non-empty strings, deduped                |
| `status`        | optional, defaults to `active`                              |

### `PUT /api/v1/patients/{id}`

Full replacement, same rules as create. Returns 200 with the updated record,
404 if the id is unknown.

### `DELETE /api/v1/patients/{id}`

Returns 204. Deletes the patient's notes by FK cascade. This is a hard delete; a
production system holding clinical records would archive instead
([README → What I would do next](../README.md#what-i-would-do-next)).

---

## Clinical notes

Nested under the patient so ownership is structural: a note is only ever
addressable through the patient it belongs to.

Notes are **append-only**: there is no update endpoint, by design. A note records
what was observed at a point in time, so a correction belongs in a new note
rather than in an edit that rewrites the clinical timeline.

### `GET /api/v1/patients/{id}/notes`

Newest first. 404 if the patient does not exist (distinct from an empty list for a
patient who exists but has no notes).

```json
{
  "items": [
    {
      "id": "be31…",
      "patient_id": "7c9e…",
      "authored_at": "2026-09-28T14:20:00Z",
      "content": "Reports improved glucose control on current regimen…",
      "created_at": "2026-09-28T14:21:03Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 25,
  "total_pages": 1,
  "has_next": false,
  "has_previous": false
}
```

### `POST /api/v1/patients/{id}/notes`

Returns 201.

```json
{
  "authored_at": "2026-09-28T14:20:00Z",
  "content": "Reports improved glucose control on current regimen."
}
```

| Field         | Rule                                                           |
| ------------- | -------------------------------------------------------------- |
| `authored_at` | optional, defaults to now; must not be in the future           |
| `content`     | required, 1–5000 chars, trimmed, must not be whitespace-only   |

### `DELETE /api/v1/patients/{id}/notes/{note_id}`

Returns 204. A `note_id` that exists but belongs to another patient returns 404
rather than 403, because 403 would confirm the note exists to someone who should
not know.

---

## Summary

### `GET /api/v1/patients/{id}/summary`

Human-readable synthesis of the profile plus notes.

```json
{
  "patient_id": "7c9e…",
  "name": "Rosa Delgado",
  "age": 45,
  "blood_type": "O+",
  "narrative": [
    "Rosa Delgado is a 45-year-old patient, blood type O+, currently active. Care is ongoing for type 2 diabetes. Allergies are recorded for penicillin and latex.",
    "6 clinical notes are on file, spanning 20 Mar 2026 to 29 Sep 2026.",
    "The patient was last seen 29 Sep 2026.",
    "Most recent note, 29 Sep 2026: Dizziness resolved. HbA1c 6.9%. Glucose control improved on current regimen."
  ],
  "conditions": ["type 2 diabetes"],
  "allergies": ["penicillin", "latex"],
  "note_count": 6,
  "generated_by": "template",
  "generated_at": "2026-10-17T09:12:00Z"
}
```

`narrative` is a list of paragraphs rather than one string: who the patient is,
the note history, when they were last seen, and the most recent note quoted. Splitting prose in the client
would break on abbreviations and decimals such as "HbA1c 6.9%".

`generated_by` is `template`: generation is deterministic, needs no network and
no key, and cannot invent a clinical fact that is not in the record. The field
exists so the UI can tell a clinician what produced the text, and so a
model-backed path later is a value change rather than a contract change
([ADR 0006](adr/0006-patient-summary-generation.md)).

Behaviour with no notes: the narrative covers the profile and states plainly that
no clinical notes are on file, rather than returning empty prose.
