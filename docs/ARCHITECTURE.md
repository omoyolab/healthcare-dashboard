# Architecture

How the system is put together, and the rules that keep it that way as it grows.
Decisions with real alternatives live in [adr/](adr/); this document is the map.

---

## 1. Shape of the system

Three processes, one network. The frontend is a static bundle; all state lives in
Postgres; the API is the only thing that talks to the database.

```
web (nginx / vite dev)  ──HTTP/JSON──►  api (FastAPI, async)  ──asyncpg──►  db (Postgres)
```

Nothing is shared between frontend and backend at build time — no shared package,
no generated client (yet). The contract between them is HTTP + OpenAPI, and the
places where that contract is mirrored by hand are listed in
[ADR 0005](adr/0005-error-contract.md) as a known risk rather than pretended away.

---

## 2. Backend layers

```
app/api/v1/*.py      HTTP only      request/response, status codes, OpenAPI
      │
      ▼
app/services/*.py    use cases      business rules, invariants, orchestration
      │
      ▼
app/repositories/*   persistence    every SQL statement in the codebase
      │
      ▼
app/models/*.py      mapping        SQLAlchemy ORM, table definitions
```

**The rule:** dependencies point downward, one step at a time. A route may call a
service. A service may call a repository. Nothing calls upward, and nothing skips
a layer.

What each layer may not do is the part that matters:

| Layer        | Must not                                                                  |
| ------------ | ------------------------------------------------------------------------- |
| route        | contain business rules, build SQL, or catch domain errors to pick a status |
| service      | import FastAPI, raise `HTTPException`, or write SQL                       |
| repository   | enforce business rules or raise domain errors                             |
| model        | know about requests, services, or Pydantic schemas                        |

The payoff is testability. `summary_service` is pure logic over plain objects, so
its tests need no HTTP client, no database and no network — which is why they run
in milliseconds and never flake. If a service imported FastAPI, that would be gone.

Cross-cutting concerns sit in `app/core/` and are installed once in the app
factory: settings, logging, middleware, exception handlers, pagination.

### Request lifecycle

```
request
  → middleware: assign request_id, start timer, bind log context
  → route: Pydantic validates the body/query (422 on failure, before any logic runs)
  → deps: open a session, build the service
  → service: enforce rules, call repositories
  → repository: one SQL statement
  → session: commit on success, rollback on exception
  → route: serialise through response_model
  → middleware: access log (method, path, status, duration_ms, request_id)
response
```

Two things to notice. Validation happens **before** any business logic, so
services can assume well-formed input. The transaction boundary is owned by the
session dependency, not by services — so a service cannot leave a half-committed
write behind, and nothing has to remember to commit.

### Why a repository layer at all

Fair question — SQLAlchemy is already an abstraction. Two concrete reasons here:

1. The list query (filter + sort + page + count, in one statement) is the most
   intricate code in the backend. Having it in one named place, rather than
   inline in a route, is the difference between tuning it and rewriting it.
2. Services get unit-tested against a fake repository. No database needed to
   prove a business rule.

What it is *not* for: swapping Postgres for another database. That never happens,
and designing for it would mean giving up Postgres-specific features we want.

---

## 3. Frontend structure

### Vertical slices, not file-type folders

```
src/features/patients/
├── api/          HTTP calls + query/mutation hooks + key factory
├── components/   UI for this feature only
├── hooks/        feature-specific logic
├── pages/        route entrypoints
├── schemas/      Zod schema (validation + inferred types)
└── types.ts
```

A change to patients touches one directory. The alternative — `components/`,
`hooks/`, `services/` at the root — means every feature change is a tour of the
repo, and nothing tells you which files belong together.

Shared code moves out only once a second feature actually needs it:
`components/ui/` (primitives), `components/layout/`, `components/feedback/`,
`lib/` (api client, config, utils).

### State ownership — the one rule to not break

| Kind of state                | Lives in               | Example                      |
| ---------------------------- | ---------------------- | ---------------------------- |
| Server data                  | TanStack Query cache   | patients, notes, summary     |
| URL / view state             | the URL (`useSearchParams`) | search text, sort, page, status filter |
| Client-only UI state         | Zustand                | theme, sidebar open          |
| Ephemeral form state         | react-hook-form        | field values, touched, errors |

Server data is **never** copied into Zustand or `useState`. The moment it is, you
own cache invalidation by hand and the app starts showing stale rows after a save.
Keeping list state in the URL is what makes the view shareable, back-button
correct and reload-safe — for free.

### The single network seam

Everything goes through `lib/api/client.ts`. Timeouts, the error envelope,
`request_id` propagation and (later) an auth header are one file, not fifty call
sites. `lib/api/errors.ts` turns a non-2xx response into a typed `ApiError`, which
is what lets a 422 become per-field form errors and a 503 become a retry button.

### Rendering performance

Three mechanisms, applied in this order:

1. **Fetch less** — paged queries, `keepPreviousData` so paging does not flash empty.
2. **Render less** — row virtualization: mounted rows are bounded by viewport
   height, not by result count.
3. **Re-render less** — memoized rows and stable callbacks, applied where a
   profile showed cost (Step 15 of the build plan).

In that order on purpose. Memoizing a component that renders 5,000 rows is
solving the wrong problem.

---

## 4. Data flow: adding a clinical note

Worth tracing because it is the one place where writes have a derived
side effect.

```
NoteForm submit
  → Zod validates (client, instant feedback)
  → useAddNote mutation: optimistic insert into the notes cache
  → POST /api/v1/patients/{id}/notes
      → route: Pydantic validates; 422 if content is empty or authored_at is future
      → note_service: patient must exist → else PatientNotFound → 404
      → note_repository: INSERT
      → commit
  → onSuccess: invalidate notes AND the patient summary
  → onError: roll back the optimistic insert, show a retryable error
```

The summary is **derived from notes**, so invalidating only the notes list would
leave a stale narrative on screen. That coupling is explicit in
`notes.queries.ts` rather than left for someone to discover.

---

## 5. Error strategy

One body shape for every failure (RFC 9457 problem details), produced by one
module, carrying a `request_id` that also appears in the structured logs.

| Condition                   | Status | Raised by                       |
| --------------------------- | ------ | ------------------------------- |
| Malformed/invalid body      | 422    | Pydantic, before any logic      |
| Unknown id                  | 404    | service → `PatientNotFound`     |
| Business-rule conflict      | 409    | service → `DuplicatePatient`    |
| Unhandled exception         | 500    | catch-all handler, generic body |

Services raise domain errors; only the handler module knows about HTTP. That is
what keeps status-code policy auditable in one file — and what lets us reuse those
services from a CLI or worker later without dragging HTTP semantics along.

A 500 never includes a stack trace or a database message in the response. In a
system holding patient data, a leaked internal error is an incident.

---

## 6. Configuration and secrets

Config enters the process in exactly two places: `backend/app/core/config.py` and
`frontend/src/lib/config/env.ts`. Both parse and validate at startup, so a typo in
an env var is a boot failure with a clear message, not a mystery 500 an hour later.
No `os.environ` or `import.meta.env` anywhere else in either codebase.

Frontend env vars are **public** — they are baked into the bundle. Nothing secret
goes in a `VITE_` variable; the LLM key lives only on the server.

---

## 7. How this grows

This system is expected to grow toward multiple user types, more involved
clinical workflows and realtime updates. The seams that matter for each:

| Future requirement   | Where it lands                                                                     |
| -------------------- | ---------------------------------------------------------------------------------- |
| Auth + RBAC          | `api/deps.py` — a `current_user` dependency; services take an actor argument        |
| Audit log            | Service layer already wraps every write; one decorator there, plus an append-only table |
| New resource         | Copy the five-file vertical slice (model, schema, repository, service, router)       |
| New API version      | `api/v2/` beside `v1/`, both mounted by `api/v1/router.py`'s sibling — URL versioning from day one for this reason |
| Realtime             | Separate WS endpoint publishing cache-invalidation events; TanStack Query already centralises invalidation |
| Deep pagination      | Swap to keyset inside the repository — the `Page` envelope does not promise offsets  |

Each of those is a known landing spot, not a built-today abstraction. Building
them now would be the more common failure mode.
