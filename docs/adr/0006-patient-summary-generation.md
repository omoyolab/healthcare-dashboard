# ADR 0006 — Deterministic template summaries

- **Status:** accepted
- **Date:** 2026-10-15

## Context

`GET /patients/{id}/summary` must return a human-readable synthesis of a
patient's profile and notes: identifiers, a coherent narrative from the notes,
and key clinical information. Both a model-generated and a template-based
approach are reasonable, so the choice itself carries the reasoning.

The deciding constraints are not about prose quality:

- Anyone cloning this repository must get working summaries with no API key.
- Tests must be deterministic and offline. An endpoint whose output varies per
  call cannot be asserted on.
- The content is clinical. A model that invents a condition or an allergy that
  is not in the record is worse than no summary at all.

## Decision

Generate the summary from a **deterministic template** over the patient record
and their notes. The narrative states the identifiers, conditions and allergies,
then characterises the note history: the number of notes, the date range they
span, and the most recent entry quoted directly.

The response carries `generated_by: "template"`. The field exists even with one
possible value, so that introducing a model-backed path later is a value change
rather than a breaking contract change, and so the UI can always tell a
clinician what produced the text.

**A model-backed provider is deliberately not built.** It would be untested in
this codebase — there is no key in CI and no way to assert on its output — and
untested code in a system of record is a liability, not a feature. The seam for
adding one is the single `build_narrative` function plus the `generated_by`
field; nothing else would have to change.

## Alternatives considered

- **Model-generated summaries.** Better prose. Rejected because it makes the
  endpoint unrunnable without a key, non-deterministic under test, and capable
  of hallucinating a clinical fact. Wrong default for this domain.
- **A provider abstraction with template and model implementations, selected by
  configuration.** This was the original plan. Rejected on building: the
  abstraction, the configuration and the fallback logic would all ship untested,
  which is a worse signal than not having the feature. A port with one
  implementation is an interface guessing at its second caller.
- **Generating at write time and caching the text in a column.** One call per
  note instead of per read, and a cached narrative that silently goes stale when
  a note is deleted — cache invalidation for a feature that does not need it.
  The read path is cheap, so generate on read.
- **Streaming the response.** Unnecessary for a few hundred words, and it
  complicates the error contract for no measured benefit.

## Consequences

- `make up` on a clean clone produces working summaries with no key, no network
  and no configuration.
- The narrative is unit-tested across the cases that matter: no notes, one note,
  many notes, missing blood type, no allergies, no conditions, no recorded
  visit. Those tests need no database and no network, so they actually get run.
- The prose is good, not great: it reads as structured clinical text rather than
  a clinician's own writing. That is the correct trade for a system of record.
- The template's phrasing lives in one function and will need updating when the
  patient schema gains fields — a known, cheap maintenance cost.
- If a model-backed path is wanted later, it needs a key in CI and recorded
  fixtures for its tests. That cost is the reason it is not here.
