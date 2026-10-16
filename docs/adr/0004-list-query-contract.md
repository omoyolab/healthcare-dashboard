# ADR 0004 — Pagination, filtering and sorting contract

- **Status:** accepted
- **Date:** 2026-10-15

## Context

`GET /patients` has to paginate, search, filter by status and sort, stay
responsive well past a hundred patients, and never block typing.
This single endpoint carries most of the backend's performance and security
surface:

- user-supplied sort fields are an injection vector if interpolated into SQL
- substring search cannot use a B-tree index, so a naive `ILIKE '%q%'` is a
  sequential scan
- offset pagination degrades at depth, because the database must count and discard
  all skipped rows
- the shape of the response locks in what we can change later without breaking clients

## Decision

**Query parameters:** `page`, `page_size` (1–100), `q`, `status` (repeatable),
`sort`.

**Sort is an allow-list enum**, `-` prefix for descending. An unknown field is a
422. No string from the request ever reaches SQL as an identifier.

**Page size over the maximum is a 422, not a silent clamp.** A client asking for
1000 rows and quietly receiving 100 will paginate incorrectly and never know why.

**One statement per request** for filter + sort + page + total, using a window
function for the count rather than a second round trip.

**Indexes match the query** ([DATA_MODEL](../DATA_MODEL.md)): composite on
`(last_name, first_name)`, `(last_visit_at DESC NULLS LAST)`, `(status)`, and a
**GIN trigram** index over the searchable text columns so `ILIKE '%q%'` stays
index-backed.

**Response envelope deliberately omits `offset`:**

```json
{ "items": [], "total": 0, "page": 1, "page_size": 25,
  "total_pages": 0, "has_next": false, "has_previous": false }
```

Clients navigate by `page` / `has_next`. Nothing in the contract promises offsets,
so the implementation can move to keyset pagination later without a breaking change.

**Search is non-blocking on the client** two ways: debounce before the request,
and `useDeferredValue` so the input never waits on a re-render.

## Alternatives considered

- **Keyset (cursor) pagination now.** Strictly better at depth, and what this
  would become at scale. Rejected for today because the UI needs numbered pages
  and a total count, which keyset does not give cheaply — and at 100–10,000 rows
  offset paging is measurably fine. The envelope keeps the door open.
- **Raw `sort` string passed to `order_by(text(...))`.** Flexible and an
  injection hole. Never.
- **Clamping `page_size` silently.** Friendlier-looking, and it produces a client
  that paginates wrongly with no signal. Explicit failure wins.
- **Separate `COUNT(*)` query.** Two round trips and a consistency window between
  them under concurrent writes.
- **`to_tsvector` full-text search.** Better for natural-language queries over
  note content; wrong for "find me a patient whose name contains *ro*", which is
  prefix/substring matching on short fields. Trigram is the right tool here.
- **Client-side filtering of a full fetch.** Works at 20 rows and is a dead end
  at any realistic size.

## Consequences

- Search stays index-backed as the table grows, at the cost of the `pg_trgm`
  extension and some write-time index maintenance.
- Adding a sortable field is an explicit two-line change (enum + index), which is
  the right amount of friction for something that affects query plans.
- Deep pages remain theoretically slow; acceptable, and the migration path is
  internal to the repository.
- Clients cannot construct arbitrary offsets — intentional, and the reason the
  future swap is non-breaking.
