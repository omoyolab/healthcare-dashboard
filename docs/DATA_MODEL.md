# Data model

Two tables. Every column and index below exists for a reason, and the reason is
written next to it.

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

## patients

| Column           | Type             | Null | Default             | Notes                                      |
| ---------------- | ---------------- | ---- | ------------------- | ------------------------------------------ |
| `id`             | `uuid`           | no   | `gen_random_uuid()` | primary key                                |
| `first_name`     | `text`           | no   |                     | `CHECK (length(trim(first_name)) > 0)`     |
| `last_name`      | `text`           | no   |                     | same check                                 |
| `date_of_birth`  | `date`           | no   |                     | `CHECK (date_of_birth < current_date)`     |
| `email`          | `citext`         | yes  |                     | `UNIQUE`, case-insensitive by column type  |
| `phone`          | `text`           | yes  |                     |                                            |
| `address_line1`  | `text`           | yes  |                     |                                            |
| `address_line2`  | `text`           | yes  |                     |                                            |
| `city`           | `text`           | yes  |                     |                                            |
| `state`          | `text`           | yes  |                     |                                            |
| `postal_code`    | `text`           | yes  |                     |                                            |
| `blood_type`     | `blood_type`     | yes  |                     | enum: `A+ A- B+ B- AB+ AB- O+ O-`          |
| `allergies`      | `text[]`         | no   | `'{}'`              | empty array means none recorded            |
| `conditions`     | `text[]`         | no   | `'{}'`              | same                                       |
| `status`         | `patient_status` | no   | `'active'`          | enum: `active inactive discharged`         |
| `last_visit_at`  | `timestamptz`    | yes  |                     | null means never seen                      |
| `created_at`     | `timestamptz`    | no   | `now()`             |                                            |
| `updated_at`     | `timestamptz`    | no   | `now()`             | set by the ORM on update                   |

### Why the columns look like this

**Age is not stored.** Only `date_of_birth` is. A stored age is wrong the day
after you write it, and no constraint can protect you from that. Age is
calculated when a patient is read.

**Email uses `citext` instead of a lowercase index.** The column type carries the
rule, so no query can bypass it by forgetting `lower()`. It needs the `citext`
extension, which the first migration creates.

**Status and blood type are real Postgres enums**, not free text with a check
constraint. An invalid value then becomes impossible to insert from anywhere,
including a manual `psql` session, and the allowed values show up in the
generated OpenAPI schema.

**Allergies and conditions are `text[]` columns.** This is a trade-off worth
stating plainly. An array cannot hold extra detail per item, such as severity or
a date recorded, and there is nothing stopping two spellings of the same word.
It is right for this app because the UI shows them as tags and never searches
across patients by allergy. If either of those changes, they become their own
tables with a foreign key, which is a migration rather than a redesign.

**The array columns are `NOT NULL DEFAULT '{}'`.** A nullable list forces every
caller to handle null and empty separately, and somebody always forgets.

**Timestamps are `timestamptz`, never `timestamp`.** A time without a zone in a
clinical record is a bug waiting for a daylight saving change.

### Indexes

| Index                                       | Serves                                            |
| ------------------------------------------- | ------------------------------------------------- |
| primary key on `id`                         | loading one patient                               |
| `UNIQUE (email)`                            | the 409 on duplicate email, enforced by the database |
| `(last_name, first_name)`                   | the default list sort                             |
| `(last_visit_at)`                           | the recent visits sort. A btree can be scanned in either direction, so one plain index covers ascending and descending |
| `(status)`                                  | the status filter and the dashboard counts        |
| GIN trigram on the searchable text          | the `q` search, so substring matching can use an index |

The trigram index is the one that needs explaining. `ILIKE '%ro%'` cannot use a
btree index, so without `pg_trgm` every search is a full table scan. At 20 rows
nobody notices, but the list is meant to stay fast well beyond that, so the index
goes in while it is still one line in a migration.

It indexes the name and email fields as a single joined expression, which is what
lets one `ILIKE` match across all of them. Alembic cannot generate an expression
index automatically, so it is written by hand in the first migration and excluded
from autogenerate comparison in `migrations/env.py`. Otherwise every future
autogenerate would offer to delete it.

## clinical_notes

| Column        | Type          | Null | Default             | Notes                                              |
| ------------- | ------------- | ---- | ------------------- | -------------------------------------------------- |
| `id`          | `uuid`        | no   | `gen_random_uuid()` | primary key                                        |
| `patient_id`  | `uuid`        | no   |                     | foreign key to `patients.id`, `ON DELETE CASCADE`  |
| `authored_at` | `timestamptz` | no   | `now()`             | when the note was written clinically               |
| `content`     | `text`        | no   |                     | `CHECK (length(trim(content)) BETWEEN 1 AND 5000)` |
| `created_at`  | `timestamptz` | no   | `now()`             | when the row was inserted                          |
| `updated_at`  | `timestamptz` | no   | `now()`             |                                                    |

`authored_at` and `created_at` are both kept because they are genuinely
different. A clinician can record today a note about an encounter last week.
Collapsing them into one column would lose the clinical timeline, which is the
thing the summary describes.

`ON DELETE CASCADE` matches the delete behaviour for patients: removing a patient
must not leave orphaned clinical notes. The database enforces it, so it holds
even for a manual `DELETE` outside the application.

Notes are append only. There is no update endpoint, because a note records what
was observed at a point in time. A correction belongs in a new note rather than
in an edit that rewrites history.

### Indexes

| Index                            | Serves                                              |
| -------------------------------- | --------------------------------------------------- |
| primary key on `id`              | deleting one note                                   |
| `(patient_id, authored_at)`      | the only read pattern: one patient's notes, newest first |

One composite index rather than two single column ones, because it covers both
the foreign key lookup and the sort in a single scan. There is no `DESC` on
`authored_at` since a btree can be read backwards, and an explicit direction only
pays off for sorts that mix directions.

## Migrations

Alembic, one revision per change, in `backend/migrations/versions/`. The first
revision creates the `citext` and `pg_trgm` extensions, both enums, both tables
and every index above.

`app/db/base.py` sets a naming convention for constraints. Without it, Alembic
invents names that differ between machines, and the next autogenerated migration
quietly drops and recreates constraints.

```bash
make migrate                             # upgrade to head
make migration m="add referral source"   # autogenerate a revision
make downgrade                           # step back one revision
```

Autogenerated revisions are read before being committed. Autogenerate is good at
spotting column changes and bad at intent: it cannot tell that a rename is a
rename rather than a drop plus an add. It also ignores check constraints
entirely, so `alembic check` passing does not mean the DDL is right.

## Seed data

`app/db/seed.py` runs on startup when `SEED_ON_STARTUP=true`. It inserts 20
patients chosen to exercise the UI rather than to look tidy:

- ages from a few months old to 90s, so age calculation is visibly correct
- all three statuses, for the filter and the dashboard chart
- some patients with no email, no address, no allergies and no conditions, so
  null handling is exercised by the seed instead of being found later
- some with no notes at all and one with six, so the summary has a live example
  of both the empty and the long case
- `last_visit_at` spread across a year, including one patient never seen
- two names that both match the search prefix "ro", so search can be checked by
  hand

The seed is idempotent. It checks whether any patients exist and returns early if
so, and it never truncates. It assumes a single API instance starts at a time,
which holds here because compose runs one; two starting together could both see
an empty table. Seeding is development data, so that is documented rather than
solved with an advisory lock. Restarting the stack is therefore safe, and
`make reset` is the explicit way to start from empty.
