"""initial schema: patients and clinical notes

Revision ID: 0001_initial
Revises: None
Create Date: 2026-10-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# create_type=False: the types are created explicitly below, so create_table
# does not try to create them a second time.
patient_status = postgresql.ENUM(
    "active", "inactive", "discharged", name="patient_status", create_type=False
)
blood_type = postgresql.ENUM(
    "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", name="blood_type", create_type=False
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    bind = op.get_bind()
    patient_status.create(bind, checkfirst=True)
    blood_type.create(bind, checkfirst=True)

    op.create_table(
        "patients",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("address_line1", sa.String(length=200), nullable=True),
        sa.Column("address_line2", sa.String(length=200), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("postal_code", sa.String(length=20), nullable=True),
        sa.Column("blood_type", blood_type, nullable=True),
        sa.Column(
            "allergies",
            postgresql.ARRAY(sa.Text()),
            server_default=sa.text("'{}'::text[]"),
            nullable=False,
        ),
        sa.Column(
            "conditions",
            postgresql.ARRAY(sa.Text()),
            server_default=sa.text("'{}'::text[]"),
            nullable=False,
        ),
        sa.Column("status", patient_status, server_default="active", nullable=False),
        sa.Column("last_visit_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Short names only: the naming convention from db.base prefixes them,
        # so passing "ck_patients_..." here yields "ck_patients_ck_patients_...".
        sa.CheckConstraint("length(btrim(first_name)) > 0", name="first_name_not_blank"),
        sa.CheckConstraint("length(btrim(last_name)) > 0", name="last_name_not_blank"),
        sa.CheckConstraint("date_of_birth < current_date", name="dob_in_past"),
        sa.PrimaryKeyConstraint("id", name="pk_patients"),
        sa.UniqueConstraint("email", name="uq_patients_email"),
    )
    op.create_index("ix_patients_last_name_first_name", "patients", ["last_name", "first_name"])
    op.create_index("ix_patients_status", "patients", ["status"])
    op.create_index("ix_patients_last_visit_at", "patients", ["last_visit_at"])

    # Substring search cannot use a btree, so ILIKE '%ro%' would be a sequential
    # scan. One concatenated expression covers searching name and email together.
    op.execute(
        """
        CREATE INDEX ix_patients_search_trgm ON patients USING gin (
            (first_name || ' ' || last_name || ' ' || coalesce(email, '')) gin_trgm_ops
        )
        """
    )

    op.create_table(
        "clinical_notes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "authored_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("length(btrim(content)) between 1 and 5000", name="content_length"),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patients.id"],
            name="fk_clinical_notes_patient_id_patients",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_clinical_notes"),
    )
    op.create_index(
        "ix_clinical_notes_patient_id_authored_at",
        "clinical_notes",
        ["patient_id", "authored_at"],
    )


def downgrade() -> None:
    op.drop_table("clinical_notes")
    op.drop_table("patients")
    bind = op.get_bind()
    blood_type.drop(bind, checkfirst=True)
    patient_status.drop(bind, checkfirst=True)
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
    op.execute("DROP EXTENSION IF EXISTS citext")
