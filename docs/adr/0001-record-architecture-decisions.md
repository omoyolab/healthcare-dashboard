# ADR 0001: Record architecture decisions

**Status:** accepted

## Context

This codebase makes choices a reader cannot infer from the code itself: why
there is a repository layer, why server data never goes into the Zustand store,
why summaries are generated from a template. Code shows what was built. It says
nothing about what else was considered and rejected.

The cost of that lands on whoever picks the project up next. An undocumented
decision is an invisible one, and an invisible decision looks like an accident.
The next engineer either keeps it out of superstition or reverses it without
knowing what it was protecting against.

## Decision

Record each significant decision as a short, numbered file in `docs/adr/`, using
the same four headings: Context, Decision, Alternatives considered,
Consequences. One decision per file.

A decision qualifies if reversing it would be expensive, or if a competent
engineer could reasonably have chosen differently.

ADRs are not edited after the fact. If a decision changes, a new ADR supersedes
the old one and the old one is marked superseded. The history of the reasoning
is the point.

## Alternatives considered

**One DECISIONS.md file.** Simpler at first, but it grows into something nobody
reads, and it cannot show the status of an individual decision.

**Comments in the code.** Right for explaining a local detail, wrong for a
choice that spans many files and has no single home.

**Nothing, just a detailed README.** The README has to serve someone trying to
run the app. Mixing both makes it worse at both jobs.

## Consequences

- Every decision with a real alternative gets a file, and the README links to
  them all.
- Someone new can read the reasoning in ten minutes without reading the code.
- The cost is a little ceremony per decision, paid once and read many times.
