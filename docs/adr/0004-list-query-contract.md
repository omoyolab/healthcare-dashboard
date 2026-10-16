# ADR 0004: Pagination, filtering and sorting contract

**Status:** accepted

## Context

`GET /patients` has to paginate, search, filter by status and sort, stay fast
well beyond a hundred patients, and never block typing.

That one endpoint carries most of the backend's performance and security
surface:

- a sort field taken from the query string is an injection risk if it reaches
  SQL as text
- substring search cannot use a btree index, so a naive `ILIKE '%q%'` scans the
  whole table
- offset pagination gets slower the deeper you go, because the database counts
  and discards the rows it skips
- the response shape decides what can be changed later without breaking clients

## Decision

Query parameters: `page`, `page_size` (1 to 100), `q`, `status` (repeatable) and
`sort`.

**Sort fields come from an allow list enum**, with a `-` prefix for descending.
An unknown field returns 422. No string from the request ever reaches SQL as an
identifier.

**A page size over the maximum returns 422 rather than being clamped.** A client
that asks for 1000 and silently receives 100 will paginate incorrectly and never
find out.

**One statement per request** for filter, sort, page and total, using a window
function for the count instead of a second query.

**Indexes match the query**: composite on `(last_name, first_name)`, plus
`(last_visit_at)`, `(status)`, and a GIN trigram index over the searchable text
so `ILIKE` can use an index.

**The response envelope has no `offset` field:**

```json
{ "items": [], "total": 0, "page": 1, "page_size": 25,
  "total_pages": 0, "has_next": false, "has_previous": false }
```

Clients navigate with `page` and `has_next`. Nothing promises offsets, so the
implementation can move to keyset pagination later without breaking anyone.

**Search does not block typing**: the input is debounced before a request is
sent, and the previous page stays on screen while the next one loads.

## Alternatives considered

**Keyset pagination now.** Better at depth and probably where this ends up. It
does not give a cheap total count or numbered pages, which the UI uses, and at
these sizes offset paging measures fine. The envelope keeps the door open.

**Passing `sort` straight into `order_by(text(...))`.** Flexible and an
injection hole.

**Clamping `page_size` silently.** Friendlier looking, and it produces a client
that pages wrongly with no signal.

**A separate `COUNT(*)` query.** Two round trips, and the count can disagree
with the page under concurrent writes.

**Full text search with `to_tsvector`.** Better for natural language over note
content. Wrong for matching part of a name, which is what this search does.

**Fetching everything and filtering in the browser.** Works at 20 rows and
nowhere else.

## Consequences

- Search stays index backed as the table grows, at the cost of the `pg_trgm`
  extension and some index maintenance on writes.
- Adding a sortable field is a deliberate two line change, enum plus index,
  which is the right amount of friction for something that affects query plans.
- Deep pages stay slower than shallow ones. Measured in
  [ADR 0007](0007-measured-performance.md), and the fix is internal to the
  repository.
- Clients cannot build arbitrary offsets, which is what makes the future change
  non breaking.
