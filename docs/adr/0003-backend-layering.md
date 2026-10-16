# ADR 0003 — Route → service → repository layering

- **Status:** accepted
- **Date:** 2026-10-15

## Context

FastAPI makes it very easy to put everything in the route: dependency-injected
session, query, business rule and response in twenty lines. For a five-endpoint
app that is genuinely fine, and pretending otherwise is how small services end up
over-engineered.

But this system is expected to grow to multiple user types, more involved
clinical workflows and realtime features. Those three things specifically break
route-centric code: authorisation rules, multi-step operations and non-HTTP entry
points (a worker, a WebSocket handler, a CLI) all need the business logic to be
callable without a request.

## Decision

Four layers, with dependencies pointing one direction only:

```
api/v1/      HTTP only: validation, status codes, response models
services/    use cases, invariants, orchestration
repositories/ every SQL statement
models/      SQLAlchemy ORM
```

Enforced constraints:

- A service must not import FastAPI or raise `HTTPException`. It raises domain
  errors from `core/errors.py`.
- A route must not build SQL or contain business rules.
- A repository must not enforce business rules.
- The transaction boundary belongs to the session dependency — commit on success,
  rollback on exception — so no service has to remember to commit.

Shared setup (settings, logging, middleware, handlers, pagination) lives in
`core/` and is installed once by the `create_app()` factory.

## Alternatives considered

- **Logic in routes, no service layer.** Right-sized for today's five endpoints.
  Rejected because of the expected growth above, and because it makes business
  rules untestable without spinning up HTTP.
- **Services but no repositories** (SQLAlchemy calls inline in services).
  Tempting — the ORM is already an abstraction. Rejected for two concrete
  reasons: the list query (filter + sort + page + count in one statement) deserves
  a named home, and services can then be unit-tested against a fake repository
  with no database.
- **Full hexagonal architecture** with ports, adapters and domain entities
  separate from ORM models. Correct for a large system, and here it would mean
  mapping every object twice for no benefit anyone could point at — the
  over-engineering failure mode, which costs as much as under-structuring.
- **Repository as a database-swap abstraction.** Explicitly not the goal. We want
  Postgres-specific features (`citext`, `pg_trgm`, arrays), and designing for a
  swap that never happens would mean giving them up.

## Consequences

- Business rules are unit-testable in milliseconds with no DB and no HTTP.
- Status-code policy lives in exactly one module, so it can be audited.
- Auth has an obvious landing spot: a `current_user` dependency in `api/deps.py`,
  with services taking an actor argument.
- Cost: a one-endpoint change touches four files instead of one. Accepted
  deliberately; this is the trade-off being bought, and for a genuinely tiny app
  it would be the wrong purchase.
- Risk: layers degrading into pass-through boilerplate. Mitigation — a service
  method that only forwards to a repository is a sign the use case is not yet
  real, and is allowed to stay thin rather than being padded with ceremony.
