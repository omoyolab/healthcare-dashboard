# Data model

Two tables. Small enough to read in one sitting, and every column and index below
exists for a reason stated here.

```
┌─────────────────────────────┐          ┌─────────────────────────────┐
│ patients                    │          │ clinical_notes              │
├─────────────────────────────┤          ├─────────────────────────────┤
│ id            uuid  PK      │ 1      * │ id          uuid  PK        │
│ first_name    text          │─────────►│ patient_id  uuid  FK CASCADE│
│ last_name     text          │          │ authored_at timestamptz     │
│ date_of_birth date          │          │ content     text            │
│ email         citext  UNIQ  │          │ created_at  timestamptz     │
│ phone         text          │          │ updated_at  timestamptz     │
│ address_*     text          │          └─────────────────────────────┘
│ blood_type    enum          │
│ allergies     text[]        │
│ conditions    text[]        │
│ status        enum          │
│ last_visit_at timestamptz   │
│ created_at    timestamptz   │
│ updated_at    timestamptz   │
└─────────────────────────────┘
```

---

## `patients`

| Column           | Type          | Null | Default    | Notes                                                 |
| ---------------- | ------------- | ---- | ---------- | ----------------------------------------------------- |
| `id`             | `uuid`        | no   | `gen_random_uuid()` | PK                                           |
| `first_name`     | `text`        | no   | —          | `CHECK (length(trim(first_name)) > 0)`                |
| `last_name`      | `text`        | no   | —          | same check                                            |
| `date_of_birth`  | `date`        | no   | —          | `CHECK (date_of_birth < current_date)`                |
| `email`          | `citext`      | yes  | —          | `UNIQUE` — case-insensitive by column type            |
| `phone`          | `text`        | yes  | —          |                                                       |
| `address_line1`  | `text`        | yes  | —          |                                                       |
| `address_line2`  | `text`        | yes  | —          |                                                       |
| `city`           | `text`        | yes  | —          |                                                       |
| `state`          | `text`        | yes  | —          |                                                       |
| `postal_code`    | `text`        | yes  | —          |                                                       |
| `blood_type`     | `blood_type`  | yes  | —          | enum: `A+ A- B+ B- AB+ AB- O+ O-`                     |
| `allergies`      | `text[]`      | no   | `'{}'`     | never null — an empty array means "none recorded"     |
| `conditions`     | `text[]`      | no   | `'{}'`     | same                                                  |
| `status`         | `patient_status` | no | `'active'` | enum: `active inactive discharged`                   |
| `last_visit_at`  | `timestamptz` | yes  | —          | null = never seen                                     |
| `created_at`     | `timestamptz` | no   | `now()`    |                                                       |
| `updated_at`     | `timestamptz` | no   | `now()`    | bumped by the ORM on update                           |

### Column decisions

**Age is not a column.** `date_of_birth` is stored and age is derived on read. A
stored age is incorrect the day after it is written, and nothing in the schema can
protect you from that.

**`citext` for email, not `lower(email)` plus an index.** The column type carries
the rule, so no query can accidentally bypass it. Needs the `citext` extension,
created in the first migration.

**Enums as real Postgres types,** not free text with a `CHECK`. An invalid status
becomes impossible to insert from anywhere, including a `psql` session, and the
type appears in the generated OpenAPI schema.

**`text[]` for allergies and conditions.** Honest trade-off: this is a denormalised
list, which means no per-item metadata (severity, date recorded, ICD code) and no
referential integrity on terminology. It is right for *this* brief — the UI shows
them as tags and never queries across patients by allergy. The moment either is
needed, they become `allergies` / `conditions` tables with an FK, which is a
migration, not a redesign. Documented here so the choice reads as a decision
rather than an oversight.

**`NOT NULL DEFAULT '{}'` on the arrays.** Nullable collections force every
consumer to handle null and empty separately, and someone always forgets.

**`timestamptz`, never `timestamp`.** A naive timestamp in a clinical record is a
bug waiting for a timezone.

### Indexes

| Index                                             | Serves                                              |
| ------------------------------------------------- | --------------------------------------------------- |
| PK on `id`                                        | detail fetch                                        |
| `UNIQUE (email)`                                  | the 409 on duplicate, enforced by the database      |
| `(last_name, first_name)`                         | the default list sort                               |
| `(last_visit_at)`                                 | the "recent visits" sort — btree scans backwards, so one plain index serves both directions |
| `(status)`                                        | the status filter and the dashboard counts          |
| GIN trigram on `first_name ‖ ' ' ‖ last_name ‖ ' ' ‖ coalesce(email,'')` | the `q` search — substring match stays index-backed |

The trigram index is the one worth defending. `ILIKE '%ro%'` cannot use a B-tree,
so without `pg_trgm` the search degrades to a sequential scan. At 20 seeded rows
nobody notices; the list has to stay responsive well past that, so the index goes
in now while it is one line in a migration.

It indexes the three searchable fields as one concatenated expression, which is
what lets a single `ILIKE` match across name and email. Because it is an
expression index, Alembic autogenerate cannot express it; it is created in the
initial migration and excluded from autogenerate comparison in `migrations/env.py`
so it is never reported as a stray index.

---

## `clinical_notes`

| Column        | Type          | Null | Default               | Notes                                            |
| ------------- | ------------- | ---- | --------------------- | ------------------------------------------------ |
| `id`          | `uuid`        | no   | `gen_random_uuid()`   | PK                                               |
| `patient_id`  | `uuid`        | no   | —                     | FK → `patients.id`, `ON DELETE CASCADE`          |
| `authored_at` | `timestamptz` | no   | `now()`               | when the note was written clinically             |
| `content`     | `text`        | no   | —                     | `CHECK (length(trim(content)) BETWEEN 1 AND 5000)` |
| `created_at`  | `timestamptz` | no   | `now()`               | when the row was inserted                        |
| `updated_at`  | `timestamptz` | no   | `now()`               |                                                  |

**`authored_at` and `created_at` are both kept** and are genuinely different: a
clinician can record a note about an earlier encounter. Collapsing them would lose
the clinical timeline, which is the thing the summary narrates.

**`ON DELETE CASCADE`** matches the hard-delete requirement for patients: deleting
a patient must not leave orphaned clinical notes. Enforced in the database, not in
application code, so it holds even for a manual `DELETE`.

### Indexes

| Index                                | Serves                                              |
| ------------------------------------ | --------------------------------------------------- |
| PK on `id`                           | delete by id                                        |
| `(patient_id, authored_at)`          | the only read pattern: a patient's notes, newest first |

One composite index rather than two single-column ones — it covers both the FK
lookup and the sort in one scan. No `DESC` on `authored_at`: a btree can be
scanned in either direction, and the explicit direction only earns its keep for
mixed-direction sorts, which this table does not have.

---

## Migrations

Alembic, one revision per change, in `backend/migrations/versions/`. The initial
revision creates the `citext` and `pg_trgm` extensions, both enums, both tables
and every index above.

`app/db/base.py` sets an explicit constraint naming convention. Without it,
Alembic autogenerate invents names that differ between machines, and the next
person's "no changes detected" migration quietly drops and recreates constraints.

```bash
make migrate                               # upgrade head
make migration m="add referral source"     # autogenerate a revision
make downgrade                             # one step back
```

Autogenerated revisions are always read before being committed. Autogenerate is
good at columns and bad at intent — it cannot see that a rename is a rename rather
than a drop plus an add.

---

## Seed data

`app/db/seed.py`, run on startup when `SEED_ON_STARTUP=true`. 20 patients chosen
to exercise the UI rather than to look tidy:

- a spread of ages from infant to 90s, so age derivation is visibly correct
- all three statuses represented, for the filter and the chart
- some patients with no email, no address, no allergies, no conditions — null
  handling is exercised by the seed rather than discovered in production
- some with no notes at all, one with a dozen, so the summary's empty and
  long cases both have a live example
- `last_visit_at` spread over a year, including one null (never seen)
- a couple of names that collide on the search prefix, so `q` is testable by hand

The seed is **idempotent**: it checks for existing data and does nothing if the
table is populated. It never truncates. Restarting the stack is therefore safe,
and `make reset` is the explicit way to start clean.
