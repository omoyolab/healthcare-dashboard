# ADR 0007: Performance measured, virtualization declined

**Status:** accepted

## Context

The patient list has to stay fast well past a hundred rows, with search that
never blocks typing. Row virtualization, which renders only the rows currently
visible, is the usual answer.

It is also easy to add and hard to justify. The way to decide is to load a
realistic amount of data, measure, and let the numbers choose.

## Measurements

5,027 patients, loaded with `backend/scripts/bulk_seed.py`. API numbers are the
mean of 20 requests against the containerised stack. Browser numbers come from
`frontend/e2e/performance.spec.ts` running in Chromium.

API:

| Request                                   | Mean   | Max    |
| ----------------------------------------- | ------ | ------ |
| `page=1&page_size=25`                     | 16.3ms | 41.0ms |
| `page=1&page_size=100`                    | 15.9ms | 23.0ms |
| `page=200&page_size=25`, a deep offset    | 17.9ms | 28.4ms |
| `q=ro`                                    | 14.4ms | 22.0ms |
| `q=del&status=active&sort=-last_visit_at` | 12.4ms | 17.5ms |
| `/patients/stats`                         | 8.6ms  | 10.2ms |

Browser:

| Page size | Time to rendered rows | DOM nodes |
| --------- | --------------------- | --------- |
| 25        | 418ms                 | 298       |
| 50        | 294ms                 | 523       |
| 100       | 346ms                 | 973       |

Typing seven characters into search took 42ms with a request in flight.

## Decision

**Do not add row virtualization.** The API rejects a `page_size` above 100, so
the number of rendered rows is capped by the contract at 100, which is about a
thousand DOM nodes. The measurements show no cost worth finding. Virtualization
would add a dependency, complicate the table markup for screen readers, and
optimise a limit that cannot be exceeded.

Keep what the numbers do support:

- server side pagination, filtering and sorting, so the row count never grows
  unbounded in the browser
- keeping the previous page on screen while the next loads, so paging never
  flashes empty
- a debounced search input, so keystrokes never wait for the network
- a memoised row component, which costs nothing and keeps re-renders in
  proportion to what changed
- one indexed SQL statement per list request, including the total

Revisit this when the design changes rather than when the data grows.
Virtualization becomes the right call if the list moves to infinite scroll or
the page size cap is lifted. Either of those supersedes this ADR.

## Alternatives considered

**Add virtualization anyway**, because it is the expected answer. Adding an
optimisation with no measurable benefit is the same mistake as skipping one that
has it.

**Infinite scroll plus virtualization.** A real option and the usual home for
windowing. Rejected because paged navigation with a total count suits a clinical
list better. Knowing there are 412 patients is information, and a list with no
end state is worse here.

**Profiling with the React Profiler instead of wall clock.** Useful for
attributing cost between components. Unnecessary once the total is this far
below the point where anyone would act on it.

## Consequences

- No virtualization library, and the table keeps real `<table>` semantics.
- Deep offsets will degrade first. At 5,000 rows, a page 200 request already
  sorts the whole result set, 5.8ms under `EXPLAIN ANALYZE`.
  [ADR 0004](0004-list-query-contract.md) keeps offsets out of the response
  envelope so this can move to keyset paging without breaking clients.
- The total count is exact, which costs a scan of the filtered set on every list
  request. Free at this size. At millions of rows, an approximate count would be
  the trade to make.
- `backend/scripts/bulk_seed.py` and `frontend/e2e/performance.spec.ts` stay in
  the repository so these numbers can be reproduced rather than believed.
