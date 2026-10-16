# ADR 0003: Route, service, repository layering

**Status:** accepted

## Context

FastAPI makes it easy to put everything in the route: the database session, the
query, the business rule and the response in twenty lines. For a five endpoint
app that is genuinely fine, and pretending otherwise is how small services end
up over-engineered.

But this app is expected to grow to multiple user types, longer clinical
workflows and realtime features. Those three things are what break route centred
code. Authorisation rules, multi step operations and non HTTP entry points such
as a worker or a WebSocket handler all need the business logic to be callable
without a request.

## Decision

Four layers, with dependencies pointing one way:

```
api/v1/        HTTP only: validation, status codes, response models
services/      use cases, rules, orchestration
repositories/  every SQL statement
models/        SQLAlchemy tables
```

Rules that go with it:

- A service must not import FastAPI or raise `HTTPException`. It raises its own
  error types from `core/errors.py`.
- A route must not build SQL or contain business rules.
- A repository must not enforce business rules.
- The session dependency owns the transaction and commits or rolls back, so no
  service has to remember to.

## Alternatives considered

**Logic in routes, no service layer.** Right sized for today's handful of
endpoints. Rejected because of the expected growth above, and because business
rules then cannot be tested without starting an HTTP app.

**Services but no repositories, with SQLAlchemy calls inline.** Tempting, since
the ORM is already an abstraction. Rejected for two reasons: the list query
does filtering, sorting, paging and counting in one statement and deserves a
named home, and services can then be tested against a fake repository with no
database.

**Full hexagonal architecture**, with ports, adapters and domain objects
separate from ORM models. Correct for a large system. Here it would mean mapping
every object twice for no benefit anyone could point at, which costs as much as
having no structure at all.

**A repository as a database swap layer.** Explicitly not the goal. This app
uses Postgres specific features on purpose.

## Consequences

- Business rules are unit tested in milliseconds with no database and no HTTP.
- Status code policy lives in one module and can be audited.
- Auth has an obvious home: a dependency in `api/deps.py`.
- A one endpoint change touches four files instead of one. That is the trade
  being made, and for a genuinely tiny app it would be the wrong one.
- A service method that only forwards to a repository is a sign the use case is
  not real yet. It is allowed to stay thin rather than be padded out.
