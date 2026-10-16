# ADR 0006: Generate summaries from a template

**Status:** accepted

## Context

`GET /patients/{id}/summary` returns a readable summary of a patient: who they
are, their conditions and allergies, and a narrative built from their clinical
notes.

Two approaches were available, a language model or a template. The deciding
constraints are not about the quality of the prose:

- anyone cloning the repository should get working summaries with no API key
- tests have to be deterministic and run offline, or they cannot assert anything
- the content is clinical, so a model inventing a condition or an allergy that
  is not in the record is worse than having no summary

## Decision

Generate the summary from a **template** over the patient record and their
notes. The narrative states the identifiers, conditions and allergies, then
describes the note history: how many notes there are, the dates they span, and
the most recent one quoted directly.

The response carries `generated_by: "template"`. The field exists even with one
possible value, so that adding a model backed path later is a change of value
rather than a change of contract, and so the interface can always tell a
clinician what produced the text.

**A model backed provider is deliberately not built.** With no key in CI there
would be no way to test it, and untested code in a system of record is a
liability rather than a feature. The place to add one later is the single
`build_narrative` function plus that field.

## Alternatives considered

**Model generated summaries.** Better prose. They make the endpoint unusable
without a key, non deterministic under test, and capable of stating a clinical
fact that is not in the record.

**A provider interface with template and model implementations, chosen by
configuration.** This was the original plan. Rejected while building it: the
interface, the configuration and the fallback would all ship untested, which is
a worse outcome than not having the feature. An interface with one
implementation is a guess about its second caller.

**Generating at write time and caching the text in a column.** One call per note
instead of per read, and a cached narrative that goes stale when a note is
deleted. That is cache invalidation for a feature that does not need it.

**Streaming the response.** Unnecessary for a few hundred words, and it
complicates the error contract for no measured gain.

## Consequences

- `make up` on a clean clone produces working summaries with no key, no network
  and no configuration.
- The narrative is unit tested across the cases that matter: no notes, one note,
  many notes, missing blood type, no allergies, no conditions, no recorded
  visit. Those tests need no database, so they actually get run.
- The prose is good rather than great. It reads as structured clinical text, not
  as a clinician's own writing, which is the right trade for a record system.
- The wording lives in one function and will need updating when the patient
  schema gains fields.
