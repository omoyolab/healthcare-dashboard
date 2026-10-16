# Architecture

How the system fits together, and the rules that keep it consistent as it grows.
Decisions that had real alternatives are recorded in [adr/](adr/). This file is
the map.

## 1. Shape of the system

There are three processes on one network. The frontend is a static bundle of
files. All data lives in Postgres. The API is the only thing that talks to the
database.

```
web (nginx, or vite in dev)  --HTTP/JSON-->  api (FastAPI)  --asyncpg-->  db (Postgres)
```

The frontend and backend share no code at build time. There is no shared package
and no generated client. The only contract between them is HTTP plus the OpenAPI
schema. A few types are copied by hand on the frontend, and that risk is written
down in [ADR 0005](adr/0005-error-contract.md) rather than ignored.

## 2. Backend layers

The backend has four layers:

```
app/api/v1/       HTTP only: reads the request, returns a response and a status code
app/services/     business rules and use cases
app/repositories/ every SQL statement in the codebase
app/models/       SQLAlchemy models, which describe the database tables
```

The rule is that dependencies point downward, one step at a time. A route calls
a service. A service calls a repository. Nothing calls upward and nothing skips
a layer.

What each layer is not allowed to do matters more than what it does:

| Layer      | Must not                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| route      | contain business rules or build SQL                                      |
| service    | import FastAPI or raise `HTTPException`                                  |
| repository | enforce business rules, though it may turn a database constraint error into a domain error |
| model      | know anything about requests, services or schemas                        |

The benefit is testing. `summary_service.py` is plain Python over plain objects,
so its tests run with no HTTP, no database and no network. They finish in
milliseconds and cannot flake. If that service imported FastAPI, that would be
gone.

Shared setup lives in `app/core/`: settings, logging, middleware, error handlers
and pagination. It is installed once by the `create_app()` factory.

### What happens during one request

```
request
  -> middleware assigns a request_id and starts a timer
  -> route: Pydantic validates the body and query (422 if invalid)
  -> deps: open a database session, build the service
  -> service: apply the rules, call repositories
  -> repository: run one SQL statement
  -> session: commit if it worked, roll back if it did not
  -> route: serialise the response through the response model
  -> middleware writes an access log with status and duration
response
```

Two details are worth pointing out. Validation happens before any business
logic, so services can assume the input is well formed. The session dependency
owns the transaction, so a service cannot leave a half written change behind and
nothing has to remember to commit.

### Why there is a repository layer

SQLAlchemy is already a layer over SQL, so this one needs justifying. Two
reasons:

1. The list query does filtering, sorting, paging and counting in a single
   statement. It is the most intricate code in the backend and it belongs in one
   named place where it can be tuned.
2. Services can be tested against a fake repository, so a business rule can be
   checked without a database.

It is not there so Postgres can be swapped for another database. That almost
never happens, and designing for it would mean giving up the Postgres features
this app uses (`citext`, `pg_trgm`, array columns).

## 3. Frontend structure

Files are grouped by feature rather than by file type:

```
src/features/patients/
├── api/          HTTP calls, query hooks, cache keys
├── components/   UI used only by this feature
├── hooks/        logic used only by this feature
├── pages/        the components a route renders
├── schemas/      Zod schema, which also produces the TypeScript type
└── types.ts
```

A change to patients touches one directory. The alternative, folders named
`components/`, `hooks/` and `services/` at the top level, means every feature
change is a tour of the repository and nothing shows which files belong
together.

Code moves out to `components/ui`, `components/layout`, `components/feedback` or
`lib/` only when a second feature actually needs it.

### Which part of the app owns which state

This is the rule that prevents most dashboard bugs:

| Kind of state                | Lives in                    | Example                       |
| ---------------------------- | --------------------------- | ----------------------------- |
| Data from the server         | TanStack Query cache        | patients, notes, summary      |
| View state                   | the URL (`useSearchParams`) | search text, sort, page, filter |
| Client-only UI state         | Zustand                     | theme, sidebar open           |
| Form values being typed      | react-hook-form             | field values and errors       |

Server data is never copied into Zustand or `useState`. The moment it is copied,
you own cache invalidation by hand, and the app starts showing stale rows after
a save.

Keeping search, sort, page and filter in the URL means the view can be shared as
a link, the back button behaves, and a reload restores what the user had.

### One place where network calls happen

Every request goes through `lib/api/client.ts`. Timeouts, the error shape,
request id propagation and any future auth header are changed in one file
instead of at every call site.

`lib/api/errors.ts` converts a failed response into a typed `ApiError`. That is
what lets the app turn a 422 into messages under the right form fields and a 503
into a retry button.

## 4. Adding a note, start to finish

This path is worth tracing because a write here changes something else that is
on screen.

```
NoteForm submit
  -> Zod validates on the client for instant feedback
  -> useAddNote inserts the note into the cache optimistically
  -> POST /api/v1/patients/{id}/notes
      -> route: Pydantic validates (empty content or a future date is a 422)
      -> note_service: the patient must exist, otherwise 404
      -> note_repository: INSERT
      -> commit
  -> on success: invalidate the notes list and the patient summary
  -> on failure: undo the optimistic insert and show a retryable error
```

The summary is generated from the notes. Invalidating only the notes list would
leave a narrative on screen that contradicts the notes listed right below it.
That link is written explicitly in `notes.queries.ts` so nobody has to discover
it.

## 5. How errors work

Every failure returns the same body shape (RFC 9457 problem details), produced
by one module, and carries a `request_id` that also appears in the logs.

| Condition                   | Status | Where it comes from                      |
| --------------------------- | ------ | ---------------------------------------- |
| Invalid body or query       | 422    | Pydantic, before any logic runs           |
| Unknown id                  | 404    | service raises `PatientNotFoundError`     |
| Conflicts with existing data | 409   | service raises `DuplicatePatientEmailError` |
| Database unreachable        | 503    | readiness probe                           |
| Anything unhandled          | 500    | catch-all handler, generic message        |

Services raise their own error types and know nothing about HTTP. Only the
handler module decides status codes, so that policy sits in one file that can be
read in a minute. It also means these services could be reused from a worker or
a CLI without dragging HTTP along.

A 500 response never contains a stack trace or a database message. In a system
holding patient data, a leaked internal error is a security incident, not an
untidy log line.

## 6. Configuration and secrets

Configuration enters the app in exactly two places: `backend/app/core/config.py`
and `frontend/src/lib/config/env.ts`. Both parse and validate at startup, so a
missing or misspelled variable stops the process immediately with a clear
message instead of causing a confusing failure an hour later. No other file
reads `os.environ` or `import.meta.env`.

Frontend variables are baked into the bundle when it is built, so they are
public by definition. Nothing secret goes into a `VITE_` variable.

## 7. Where the next features would go

The app is expected to grow. These are the places each likely addition lands:

| Future requirement   | Where it lands                                                      |
| -------------------- | ------------------------------------------------------------------- |
| Auth and user roles  | `api/deps.py` gains a `current_user` dependency; services take an actor |
| Audit log            | the service layer already wraps every write, so one decorator plus an append-only table |
| A new resource       | copy the five file slice: model, schema, repository, service, router |
| A new API version    | `api/v2/` next to `v1/`, which is why the version is in the URL now  |
| Realtime updates     | a WebSocket endpoint publishing cache invalidation events            |
| Very deep pagination | switch to keyset paging inside the repository; the response envelope never promised offsets |

None of these are built today. They are known landing spots, which is the point
of the layering.
