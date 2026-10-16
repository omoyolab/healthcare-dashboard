# Healthcare Dashboard

A patient management dashboard for a medical practice: React + TypeScript
frontend, FastAPI backend, PostgreSQL.

![Dashboard](docs/screenshots/dashboard.png)

<details>
<summary>More screens</summary>

**Patient list.** Search, status filters, sortable columns and paging, all held
in the URL so a view can be shared or reloaded.

![Patient list](docs/screenshots/patients.png)

**Patient detail.** The generated summary, the record it was built from, and the
clinical notes.

![Patient detail](docs/screenshots/patient-detail.png)

**Dark theme.** The same page with one set of tokens swapped.

![Patient detail in dark theme](docs/screenshots/patient-detail-dark.png)

</details>

## Quick start

Requires Docker with Compose v2. Nothing else: no local Python, Node or
Postgres.

```bash
cp .env.example .env     # safe local defaults, no edits needed
make up                  # builds, migrates, seeds, starts everything
```

| Service  | URL                          |
| -------- | ---------------------------- |
| Frontend | http://localhost:5173        |
| API docs | http://localhost:8000/docs   |
| Health   | http://localhost:8000/health |
| Postgres | localhost:5432               |

The database is migrated and seeded with 20 patients and their clinical notes on
first start.

```bash
make help      # every target
make logs      # tail all services
make down      # stop, keep the data
make reset     # wipe the database volume and start again
make test      # backend and frontend suites
make lint      # ruff, mypy, eslint, tsc, prettier
```

### The two Compose files

`docker-compose.yml` describes the production shape, where nginx serves the
built bundle. `docker-compose.override.yml` holds development concerns only, and
Compose applies it automatically.

```bash
make up                                           # development: Vite, hot reload
docker compose -f docker-compose.yml up --build   # production shape: nginx
```

Both are verified; CI runs the end-to-end suite against the second.

### After changing dependencies

Dependencies live inside the images, so a new package needs a rebuild of that
service:

```bash
npm install <package> --prefix frontend   # or edit backend/pyproject.toml
docker compose up -d --build web          # or: --build api migrate
```

Editing source needs no rebuild. Both services mount their source and reload.

## What it does

- Browse, search, sort and page a patient list, with a rows-per-page control
- Filter by status, several at once
- View a patient with their clinical notes and a generated summary
- Add and delete notes, which updates the summary
- Create and edit patients, validated on the client and the server
- Dashboard with practice counts, status distribution and recent visits
- Light and dark themes, responsive down to small screens

## Running it without Docker

<details>
<summary>Backend</summary>

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Needs a reachable Postgres. `docker compose up db` is the easy way.

</details>

<details>
<summary>Frontend</summary>

```bash
cd frontend
npm install
npm run dev
```

</details>

## Configuration

Copy `.env.example` to `.env`. The defaults are development-safe and nothing
there is a real secret.

| Variable            | Default                 | Notes                                                 |
| ------------------- | ----------------------- | ----------------------------------------------------- |
| `POSTGRES_USER`     | `postgres`              |                                                       |
| `POSTGRES_PASSWORD` | `postgres`              | Local only                                            |
| `POSTGRES_DB`       | `healthcare`            |                                                       |
| `POSTGRES_HOST`     | `localhost`             | Compose overrides this to `db` inside the network     |
| `POSTGRES_PORT`     | `5432`                  |                                                       |
| `DATABASE_URL`      | derived                 | Overrides the parts above when set                    |
| `APP_ENV`           | `development`           | `production` switches log format and disables `/docs` |
| `LOG_LEVEL`         | `INFO`                  |                                                       |
| `CORS_ORIGINS`      | `http://localhost:5173` | Comma-separated                                       |
| `SEED_ON_STARTUP`   | `true`                  | Idempotent, safe to leave on                          |
| `VITE_API_BASE_URL` | empty                   | Empty means same origin; `/api` is proxied            |

Configuration is read in two files only, `backend/app/core/config.py` and
`frontend/src/lib/config/env.ts`. Both validate at startup, so a bad variable
fails the boot instead of a request an hour later.

## API

Base path `/api/v1`, except `/health`. Interactive docs at `/docs`.

| Method   | Path                             | Purpose                                |
| -------- | -------------------------------- | -------------------------------------- |
| `GET`    | `/health`                        | Liveness                               |
| `GET`    | `/health/ready`                  | Readiness, 503 if the database is down |
| `GET`    | `/patients`                      | List: page, search, filter, sort       |
| `POST`   | `/patients`                      | Create                                 |
| `GET`    | `/patients/stats`                | Dashboard counts in one query          |
| `GET`    | `/patients/{id}`                 | Fetch one                              |
| `PUT`    | `/patients/{id}`                 | Replace                                |
| `DELETE` | `/patients/{id}`                 | Delete                                 |
| `GET`    | `/patients/{id}/notes`           | List notes                             |
| `POST`   | `/patients/{id}/notes`           | Add a note                             |
| `DELETE` | `/patients/{id}/notes/{note_id}` | Delete a note                          |
| `GET`    | `/patients/{id}/summary`         | Generated summary                      |

Every error returns the same body (RFC 9457 problem details) carrying a
`request_id` that also appears in the logs, so the client has one error path.

Examples, query parameters and status codes: [docs/API.md](docs/API.md). Schema
and indexes: [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

## Project structure

```
backend/app/
├── api/v1/          HTTP layer: routes, status codes, response models
├── core/            config, logging, errors, middleware, pagination
├── db/              engine, session, Base, seed
├── models/          SQLAlchemy tables
├── repositories/    all SQL
├── schemas/         Pydantic request and response contracts
└── services/        use cases and business rules

frontend/src/
├── app/             providers, router, query client
├── components/      layout, UI primitives, feedback
├── features/        patients, notes, dashboard
├── lib/             API client, config, utils
└── store/           UI-only state
```

Frontend code is grouped by feature rather than by file type, so a change to
patients touches one directory. How the layers fit together, and the rules that
keep them that way, are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Testing

```bash
make test           # backend and frontend
make test-e2e       # Playwright against the running stack
```

| Layer               | Tool           | What it proves                                          |
| ------------------- | -------------- | ------------------------------------------------------- |
| Backend unit        | pytest         | Summary generation and pagination rules, no DB or HTTP  |
| Backend integration | pytest + httpx | Real routes against real Postgres: status codes, paging |
| Frontend component  | Vitest + RTL   | Validation, server-error mapping, non-blocking search   |
| End to end          | Playwright     | The main journey, plus axe accessibility scans          |

**55 backend tests** (97% coverage of `app/`), **37 frontend tests**, **22
end-to-end tests** across desktop and mobile viewports.

Integration tests create and migrate a throwaway `healthcare_test` database, so
the migration itself is under test. Mocking the database would let wrong SQL
pass, which is the one thing those tests exist to catch.

CI runs the same commands on every push: lint, typecheck, both suites,
`alembic check` for model drift, and the end-to-end suite against the built
stack.

## Technical choices

| Area           | Choice                               | Why                                                            |
| -------------- | ------------------------------------ | -------------------------------------------------------------- |
| Backend        | FastAPI, SQLAlchemy 2 async, asyncpg | I/O-bound workload, typed ORM, OpenAPI for free                 |
| Schema changes | Alembic                              | An init script cannot express a change after the first release  |
| Backend layers | route, service, repository           | Business rules stay testable without HTTP or a database         |
| Server state   | TanStack Query                       | Caching, deduplication and explicit invalidation                |
| List state     | the URL                              | Shareable views, working back button, reload keeps filters      |
| Client state   | Zustand, kept tiny                   | Theme and sidebar only; server data never goes in a store       |
| Styling        | Tailwind v4 CSS tokens               | Theming is one token set, not duplicated class lists            |
| Forms          | react-hook-form + Zod                | One schema gives both validation and the TypeScript type        |
| Errors         | RFC 9457 problem details             | One body shape, one client error path, `request_id` for support |

What was rejected, and why, is recorded in short decision records:

| ADR                                                   | Decision                                      |
| ----------------------------------------------------- | --------------------------------------------- |
| [0001](docs/adr/0001-record-architecture-decisions.md) | Record decisions as ADRs                      |
| [0002](docs/adr/0002-frontend-stack.md)                | Frontend stack and state ownership            |
| [0003](docs/adr/0003-backend-layering.md)              | Route, service, repository layering           |
| [0004](docs/adr/0004-list-query-contract.md)           | Pagination, filtering and sorting contract    |
| [0005](docs/adr/0005-error-contract.md)                | One error shape, validation on both sides     |
| [0006](docs/adr/0006-patient-summary-generation.md)    | Deterministic template summaries              |
| [0007](docs/adr/0007-measured-performance.md)          | Performance measured, virtualization declined |

## Performance

Measured with 5,027 patients loaded by `backend/scripts/bulk_seed.py`. The list
endpoint answers in **16ms** on average, search in **14ms** and the dashboard
aggregate in **9ms**. Typing seven characters into search takes **42ms** with a
request in flight.

Row virtualization was measured and declined: the API caps `page_size` at 100,
so the number of rendered rows is bounded by the contract and there is nothing
to virtualize. Full numbers and reasoning in
[ADR 0007](docs/adr/0007-measured-performance.md).

What the measurements do support: server-side paging, filtering and sorting; one
indexed SQL statement per list request, including the total; a GIN trigram index
so substring search stays index-backed; keeping the previous page on screen
while the next loads; debounced input; and memoised rows.

## What this would need next

An honest list of what a production deployment needs and this does not have:

- **Auth, roles and an audit log.** This is patient data. The layering leaves a
  seam for it: a dependency in `api/deps.py`, and the service layer already
  wraps every write.
- **Soft delete.** Clinical records should be archived rather than removed. The
  models carry the timestamps already; today's delete is a hard one.
- **Keyset pagination**, once the dataset makes deep offsets hurt. The response
  envelope deliberately never exposed offsets, so that change is not breaking.
- **Rate limiting and payload caps** at the edge.
- **A generated API client**, so frontend types come from the OpenAPI schema
  rather than being mirrored by hand. That drift risk is noted in ADR 0005.
- **Tracing**, not just structured logs.
