# ADR 0005: One error shape, validation on both sides

**Status:** accepted

## Context

The API needs accurate status codes and useful validation errors. The frontend
needs to show a message the user can act on, for both invalid input and network
failures.

Those two needs meet at the response body. If every failure returns a different
shape, such as FastAPI's default `{"detail": [...]}` for validation, a plain
string for `HTTPException` and HTML for an unhandled 500, then the client needs
a parser per endpoint and ends up showing "something went wrong" instead.

There is also a confidentiality angle. This system holds patient data, so a
stack trace or database message in a response is a security incident rather than
an untidy log.

## Decision

**One body shape for every error**, following RFC 9457, produced by a single
module:

```json
{ "type": "/errors/validation-error", "title": "Validation failed",
  "status": 422, "detail": "2 fields are invalid.",
  "instance": "/api/v1/patients", "request_id": "01JB2ZQ4K8",
  "errors": [{ "field": "date_of_birth", "message": "must be in the past" }] }
```

- Services raise their own error types and never mention HTTP. The handler
  module maps them to 404, 409 and 422, so status code policy sits in one file.
- `request_id` appears in the body, in the `X-Request-ID` header and in every
  log line for that request. A user can quote it and we can find the request.
- Unhandled exceptions return a generic message with the request id. The detail
  goes to the logs only.
- Validation runs on both sides, and the server is the authority. The client
  schema exists for fast feedback, not for safety.
- On a 422 the client puts each field error under the matching input instead of
  showing one banner.

## Alternatives considered

**FastAPI defaults.** No work, three different shapes, and arrays that are
awkward to map onto fields.

**A custom `{ "error": { "code": ... } }` envelope.** Equivalent in substance.
RFC 9457 was chosen because it is a recognisable standard that tooling can read.

**Server side validation only.** Safe, but every mistake costs a round trip,
which is poor on a form this size.

**Client side validation only.** Not an option. A client is not a security
boundary.

**Generating the frontend types and schema from OpenAPI.** The right long term
answer, and it removes the duplication below. Not done yet because the
generation step, its CI wiring and the mapping to Zod cost more than the
duplication saves at this size. Listed in the README as a next step.

**Returning 403 for a note that belongs to another patient.** That confirms the
note exists to someone who should not know. It returns 404.

## Consequences

- The frontend has one error path, which makes a retry button, a field error and
  a toast three branches of one decision.
- Internal details never reach the client, and the request id is the support
  bridge.
- Accepted risk: the Zod schema and the Pydantic schema state the same rules in
  two places and can drift. The server rejects anything the client misses, so
  drift is a user experience bug rather than a data integrity one, and the two
  files reference each other.
