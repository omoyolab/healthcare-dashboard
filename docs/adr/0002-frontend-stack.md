# ADR 0002 — Frontend stack and state ownership

- **Status:** accepted
- **Date:** 2026-10-15

## Context

The UI framework, state management, routing and styling were all open choices.
The app is a data-heavy dashboard: mostly reading server data, with forms and a
long list, expected to grow toward multiple user types and realtime features.

The deciding question for a dashboard is not which library is fashionable. It is
**who owns a piece of state**. Almost every bug in an app of this shape — stale
rows after a save, two spinners racing, filters lost on reload — comes from
server data being copied into client state.

## Decision

**Libraries**

| Concern         | Choice                        |
| --------------- | ----------------------------- |
| Build           | Vite                          |
| UI              | React 19 + TypeScript, strict |
| Server state    | TanStack Query                |
| Client UI state | Zustand                       |
| Routing         | React Router (lazy routes)    |
| Styling         | Tailwind v4 + local primitives |
| Forms           | react-hook-form + Zod         |
| Long lists      | TanStack Virtual              |
| Tests           | Vitest + RTL + MSW + Playwright |

**State ownership, enforced as a rule:**

| State                 | Owner                      |
| --------------------- | -------------------------- |
| Server data           | TanStack Query cache       |
| Search / sort / page / filter | the URL (`useSearchParams`) |
| Theme, sidebar        | Zustand                    |
| In-progress form data | react-hook-form            |

Server data is never copied into a store or `useState`. List state goes in the
URL, not component state.

## Alternatives considered

- **Redux Toolkit (+ RTK Query).** Capable and a defensible answer. Rejected
  because the non-RTK-Query parts would sit nearly unused: there is very little
  genuine client state here, and the reducer/slice ceremony would be overhead
  without a payoff. If this app grows complex client-side workflows, that
  calculus changes.
- **Server state in Zustand with manual fetching.** Means hand-writing request
  dedupe, caching, invalidation and retry — all bugs TanStack Query has already
  fixed.
- **A full component library (MUI, Ant, Chakra).** Faster to a demo, slower to a
  specific design, and heavier. It would also hide the component-design
  decisions behind someone else's defaults. Local primitives with Tailwind tokens keep theming to one token
  swap.
- **Component state for list filters.** Simpler for ten minutes, then the view is
  unshareable, the back button is wrong and reload drops the user's filters.
- **TanStack Router.** Better type-safety for search params, at the cost of a
  less familiar API; React Router covers what is needed here.

## Consequences

- Invalidation becomes explicit and auditable: after a mutation we name exactly
  which queries are now wrong (including the summary, which derives from notes).
- Filters are shareable and reload-safe for free, because the URL is the state.
- Zustand stays tiny — if it ever holds server data, that is a code-review failure,
  not a design evolution.
- Mirroring validation rules in a Zod schema alongside the backend's Pydantic
  schema is a real drift risk; it is accepted and tracked in
  [ADR 0005](0005-error-contract.md), with a generated client named as the fix.
- Local UI primitives cost an afternoon that a component library would have saved.
