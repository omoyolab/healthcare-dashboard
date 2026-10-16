# ADR 0007 — Performance measured, virtualization declined

- **Status:** accepted
- **Date:** 2026-10-15

## Context

The patient list has to stay efficient well past a hundred rows, with search that
never blocks typing. Row virtualization is the usual answer.

Virtualization is the kind of optimisation that is easy to add and hard to
justify. The honest way to decide is to load a realistic dataset and measure,
then let the numbers choose.

## Measurements

5,027 patients, loaded with `backend/scripts/bulk_seed.py`. API timings are the
mean of 20 requests against the containerised stack; browser timings come from
`frontend/e2e/performance.spec.ts` in Chromium.

**API**

| Request                               | Mean   | Max    |
| ------------------------------------- | ------ | ------ |
| `page=1&page_size=25`                 | 16.3ms | 41.0ms |
| `page=1&page_size=100`                | 15.9ms | 23.0ms |
| `page=200&page_size=25` (deep offset) | 17.9ms | 28.4ms |
| `q=ro`                                | 14.4ms | 22.0ms |
| `q=del&status=active&sort=-last_visit_at` | 12.4ms | 17.5ms |
| `/patients/stats`                     | 8.6ms  | 10.2ms |

**Browser**

| Page size | Wall time to rendered rows | DOM nodes |
| --------- | -------------------------- | --------- |
| 25        | 418ms                      | 298       |
| 50        | 294ms                      | 523       |
| 100       | 346ms                      | 973       |

Typing seven characters into search: **42ms** total, with a request in flight.

## Decision

**Do not add row virtualization.** The API rejects `page_size` above 100, so the
number of rendered rows is bounded by the contract at 100 — about 1,000 DOM
nodes, which browsers handle without strain, and the measurements show no cost
to find. Virtualization would add a dependency, complicate the table's
semantics, and optimise a bound that cannot be exceeded.

**Keep what the measurements do support:**

- Server-side pagination, filtering and sorting, so row count never grows
  unbounded in the client.
- `keepPreviousData`, so paging and typing never blank the table.
- Debounced input, so keystrokes never wait on the network (42ms for 7 keys).
- A memoised row component, which costs nothing and keeps re-renders
  proportional to what changed.
- One indexed SQL statement per list request, including the total.

**Revisit when the design changes, not when the data grows:** virtualization
becomes correct if the list moves to infinite scroll or the page-size cap is
lifted. Both are design changes, and either one makes this ADR superseded.

## Alternatives considered

- **Add virtualization anyway**, because it is the expected answer. Rejected:
  adding an optimisation with no measurable benefit is the same mistake as
  skipping one that has it, and it would make the table markup worse for screen
  readers.
- **Infinite scroll plus virtualization.** A real option, and the usual home for
  windowing. Rejected because paged navigation with a total count is what a
  clinical list needs — "patient 3 of 412" is information, and an endless scroll
  with no end state is worse for this use.
- **Measuring with React Profiler instead of wall-clock.** Useful for attributing
  cost between components; unnecessary once the total is this far below the
  threshold where anyone would act.

## Consequences

- No virtualization library; the table keeps real `<table>` semantics.
- The deep-offset case is the first thing that will degrade: at 5k rows a page
  200 request already sorts the full result set (5.8ms in `EXPLAIN ANALYZE`).
  [ADR 0004](0004-list-query-contract.md) keeps the envelope free of offsets so
  that can move to keyset pagination without breaking clients.
- The total count is exact, which costs a scan of the filtered set on every list
  request. At this size it is free; at millions of rows an approximate count or a
  count-on-first-page-only strategy would be the trade to make.
- `backend/scripts/bulk_seed.py` and `frontend/e2e/performance.spec.ts` stay in
  the repository, so these numbers can be reproduced rather than trusted.
