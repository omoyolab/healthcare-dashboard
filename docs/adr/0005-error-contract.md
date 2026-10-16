# ADR 0005 — One error contract, validation on both sides

- **Status:** accepted
- **Date:** 2026-10-15

## Context

The API needs input validation and accurate HTTP status codes, and the frontend
needs to show meaningful messages for both validation failures and network
failures.

Those two requirements meet at the response body. If every failure mode returns a
different shape — FastAPI's default `{"detail": [...]}` for validation, a string
`detail` for `HTTPException`, HTML for an unhandled 500 — then the client needs a
parser per endpoint, and the fallback is the "something went wrong" toast that
tells the user nothing.

There is also a confidentiality dimension: this system holds patient data, so a
leaked stack trace or database message in an error response is a real incident,
not an untidiness.

## Decision

**One body shape for every error**, following RFC 9457 problem details, produced
by a single `core/exception_handlers.py`:

```json
{ "type": "/errors/validation-error", "title": "Validation failed",
  "status": 422, "detail": "2 fields are invalid.",
  "instance": "/api/v1/patients", "request_id": "01JB2ZQ4K8",
  "errors": [{ "field": "date_of_birth", "message": "must be in the past" }] }
```

- Services raise **domain** errors (`PatientNotFound`, `DuplicatePatient`,
  `DomainValidationError`) and never mention HTTP. The handler module owns the
  mapping to 404 / 409 / 422, so status-code policy is one auditable file.
- `request_id` is in the body, in the `X-Request-ID` header, and in every log line
  for that request. A user can report an id and we can find the exact request.
- Unhandled exceptions return a **generic** message with the `request_id`; the
  detail goes to the logs only.
- Validation runs on **both** sides, and **the server is the authority**. The
  client's Zod schema exists for instant feedback, not for safety.
- On a 422, the client maps each `errors[].field` onto the matching form input.
  Field-level server errors land on fields, not in a banner.

## Alternatives considered

- **FastAPI defaults.** Zero work, three different shapes, and `detail` arrays
  that are awkward to map to fields. Rejected.
- **A bespoke `{ "error": { "code": ... } }` envelope.** Equivalent in substance;
  RFC 9457 chosen because it is a recognisable standard that tooling can consume.
- **Server-side validation only.** Safe, but every mistake costs a round trip —
  poor UX on a form this size.
- **Client-side validation only.** Not an option. A client is not a security
  boundary.
- **Generating the frontend types and schema from OpenAPI.** This is the *correct*
  long-term answer and removes the drift risk below. Not done yet
  because the generation step, its CI wiring and the Zod-from-OpenAPI mapping
  would cost more than the duplication it saves at this size. Named in the README
  as the next step.
- **Returning `403` for a note belonging to another patient.** Confirms the note
  exists to someone who should not know. Returns 404.

## Consequences

- The frontend has exactly one error path: `ApiError` with typed narrowing, which
  makes a retry button, a field error and a toast three branches of one decision.
- Internal details never reach the client; the `request_id` is the support bridge.
- **Accepted risk:** the Zod schema and the Pydantic schema state the same rules
  in two places and can drift. Mitigations: the server rejects anything the client
  misses (so drift is a UX bug, never a data-integrity one), the two files
  reference each other in comments, and an integration test asserts that the
  documented field rules actually produce 422s.
