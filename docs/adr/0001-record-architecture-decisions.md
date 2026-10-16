# ADR 0001 — Record architecture decisions

- **Status:** accepted
- **Date:** 2026-10-15

## Context

This codebase makes a dozen choices that a reader cannot infer from the code:
why there is a repository layer, why server state never enters the Zustand store,
why summaries are template-first. Code shows *what*; it is silent on *what else
was considered and rejected*.

The cost lands on whoever picks this up next: an undocumented decision is an
invisible one, and an invisible decision looks like an accident. The second
engineer then either preserves it out of superstition or reverses it without
knowing what it was protecting against.

## Decision

Record each significant decision as a short, numbered, immutable ADR in
`docs/adr/`, in the format: Context → Decision → Alternatives considered →
Consequences. One decision per file.

A decision qualifies if reversing it would be expensive, or if a competent
engineer would reasonably have chosen differently.

ADRs are immutable: a decision that changes gets a new ADR that supersedes the
old one, and the old one is marked superseded rather than edited. The history of
reasoning is the point.

## Alternatives considered

- **A single DECISIONS.md.** Simpler to start, but grows into a file nobody reads
  and nobody can diff meaningfully. Loses the per-decision status.
- **Comments in the code.** Right for local *why*, wrong for cross-cutting
  choices that live in no single file.
- **Nothing, just a detailed README.** The README has to serve someone trying to
  *run* the app. Mixing both makes it worse at both jobs.

## Consequences

- Every decision with a real alternative gets an ADR; the README links to them.
- Any decision made during the build that has a real alternative gets an ADR
  before the code lands, not after.
- Someone new can read the reasoning in ten minutes without reading the code.
- Cost: a little ceremony per decision, paid once and read many times.
