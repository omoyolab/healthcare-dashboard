"""Patient persistence. Every patient SQL statement lives here."""

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import ColumnElement, Text, cast, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import InstrumentedAttribute

from app.core.errors import DuplicatePatientEmailError
from app.models.patient import Patient, PatientStatus
from app.repositories.base import BaseRepository, violated_constraint
from app.schemas.patient import PatientListQuery, PatientSortField

SORT_COLUMNS: dict[PatientSortField, InstrumentedAttribute[Any]] = {
    PatientSortField.LAST_NAME: Patient.last_name,
    PatientSortField.FIRST_NAME: Patient.first_name,
    PatientSortField.DATE_OF_BIRTH: Patient.date_of_birth,
    PatientSortField.LAST_VISIT_AT: Patient.last_visit_at,
    PatientSortField.CREATED_AT: Patient.created_at,
}


def search_expression() -> ColumnElement[str]:
    """Mirrors the GIN trigram index expression exactly.

    If this drifts from the index in migration 0001, the planner silently stops
    using it and search degrades to a sequential scan.
    """
    space = cast(" ", Text)
    return (
        cast(Patient.first_name, Text)
        + space
        + cast(Patient.last_name, Text)
        + space
        + cast(func.coalesce(Patient.email, ""), Text)
    )


class PatientRepository(BaseRepository[Patient]):
    model = Patient

    @staticmethod
    def _filters(query: PatientListQuery) -> list[ColumnElement[bool]]:
        """Shared by the page query and the fallback count, so they cannot drift."""
        conditions: list[ColumnElement[bool]] = []
        if query.q:
            conditions.append(search_expression().ilike(f"%{query.q}%"))
        if query.status:
            conditions.append(Patient.status.in_(query.status))
        return conditions

    async def list_page(self, query: PatientListQuery) -> tuple[Sequence[Patient], int]:
        """Returns one page plus the total matching count."""
        # A window count rides along with the rows, so the usual case needs no
        # second query and has no consistency gap between page and total.
        total = func.count().over().label("total")
        stmt = select(Patient, total).where(*self._filters(query))

        column = SORT_COLUMNS[query.sort_field]
        ordering = column.desc() if query.descending else column.asc()
        # id as the tiebreaker: without it, rows with equal sort values can
        # appear on two pages or on neither.
        stmt = stmt.order_by(ordering.nulls_last(), Patient.id)
        stmt = stmt.offset(query.page_request.offset).limit(query.page_request.limit)

        rows = (await self._session.execute(stmt)).all()
        if rows:
            return [row[0] for row in rows], int(rows[0].total)

        # Past the last page there are no rows, so the window count comes back
        # with them. Count separately rather than reporting a total of zero
        # while earlier pages hold matches.
        count_stmt = select(func.count()).select_from(Patient).where(*self._filters(query))
        return [], int(await self._session.scalar(count_stmt) or 0)

    async def stats(self) -> dict[str, int]:
        """Every dashboard count in one statement, using FILTER aggregates."""
        cutoff = datetime.now(UTC) - timedelta(days=30)
        stmt = select(
            func.count().label("total"),
            func.count().filter(Patient.status == PatientStatus.ACTIVE).label("active"),
            func.count().filter(Patient.status == PatientStatus.INACTIVE).label("inactive"),
            func.count().filter(Patient.status == PatientStatus.DISCHARGED).label("discharged"),
            func.count().filter(Patient.last_visit_at.is_(None)).label("never_seen"),
            func.count().filter(Patient.last_visit_at >= cutoff).label("seen_last_30_days"),
        )
        row = (await self._session.execute(stmt)).one()
        return dict(row._mapping)

    def _translate(self, exc: IntegrityError, entity: Patient) -> None:
        if violated_constraint(exc) == "uq_patients_email":
            raise DuplicatePatientEmailError(entity.email or "") from exc
