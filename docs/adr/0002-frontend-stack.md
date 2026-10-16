# ADR 0002: Frontend stack and state ownership

**Status:** accepted

## Context

The UI framework, state management, routing and styling were all open choices.

The app is a data heavy dashboard. It mostly reads data from the server, with a
few forms and one long list, and it is expected to grow toward multiple user
types and realtime updates.

The deciding question for an app like this is not which library is popular. It
is which part of the app owns each piece of state. Nearly every bug in a
dashboard of this shape, such as stale rows after a save, two spinners racing,
or filters lost on reload, comes from server data being copied into client
state.

## Decision

Libraries:

| Concern         | Choice                          |
| --------------- | ------------------------------- |
| Build           | Vite                            |
| UI              | React with TypeScript in strict mode |
| Server data     | TanStack Query                  |
| Client UI state | Zustand                         |
| Routing         | React Router with lazy routes   |
| Styling         | Tailwind with CSS variable tokens |
| Forms           | react-hook-form with Zod        |
| Tests           | Vitest, Testing Library, Playwright |

State ownership, enforced as a rule:

| State                     | Owner             |
| ------------------------- | ----------------- |
| Data from the server      | TanStack Query    |
| Search, sort, page, filter | the URL          |
| Theme and sidebar         | Zustand           |
| Form values being typed   | react-hook-form   |

Server data is never copied into a store or `useState`. List state goes in the
URL, not in component state.

## Alternatives considered

**Redux Toolkit with RTK Query.** A reasonable answer. Rejected because the
non-RTK-Query parts would sit almost unused: there is very little genuine client
state here, so the slices and reducers would be overhead without a payoff. If
this app grows complex client side workflows, that changes.

**Server data in Zustand with manual fetching.** That means hand writing request
deduplication, caching, invalidation and retries, all of which TanStack Query
already handles.

**A full component library such as MUI or Ant.** Faster to a demo, slower to a
specific design, and heavier. Local primitives with Tailwind tokens keep theming
to one set of variables.

**Component state for list filters.** Simpler for ten minutes, then the view
cannot be shared, the back button is wrong, and a reload drops the user's
filters.

**TanStack Router.** Better typing for search params, at the cost of a less
familiar API. React Router covers what is needed here.

## Consequences

- Invalidation is explicit. After a mutation we name the queries that are now
  wrong, including the summary, which is generated from notes.
- Shareable and reload safe filters come for free, because the URL is the state.
- Zustand stays tiny. If server data ever lands in it, that is a code review
  failure and not an evolution of the design.
- The Zod schema repeats rules that Pydantic also enforces. That risk is
  accepted and tracked in [ADR 0005](0005-error-contract.md).
- Writing UI primitives costs an afternoon that a component library would have
  saved.
