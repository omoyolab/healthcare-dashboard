"""The seed must be safe to run on every startup."""

import asyncio

from sqlalchemy import func, select

from app.core.config import Settings
from app.db.seed import SEED_PATIENTS, seed_if_empty
from app.db.session import Database
from app.models import ClinicalNote, Patient


async def _seed_twice(settings: Settings) -> tuple[int, int, int, int]:
    database = Database(settings.sqlalchemy_dsn)
    try:
        async with database.session() as session:
            first = await seed_if_empty(session)
        async with database.session() as session:
            second = await seed_if_empty(session)
        async with database.session() as session:
            patients = await session.scalar(select(func.count()).select_from(Patient)) or 0
            notes = await session.scalar(select(func.count()).select_from(ClinicalNote)) or 0
        return first, second, patients, notes
    finally:
        await database.dispose()


def test_seeding_twice_does_not_duplicate(settings: Settings) -> None:
    first, second, patients, notes = asyncio.run(_seed_twice(settings))

    assert first == len(SEED_PATIENTS)
    assert second == 0, "second run must be a no-op"
    assert patients == len(SEED_PATIENTS)
    assert notes > 0


def test_seed_covers_the_cases_the_ui_has_to_handle(settings: Settings) -> None:
    statuses = {patient.status for patient in SEED_PATIENTS}
    assert len(statuses) == 3, "all three statuses should be represented"
    assert any(patient.email is None for patient in SEED_PATIENTS)
    assert any(patient.last_visit_days_ago is None for patient in SEED_PATIENTS)
    assert any(not patient.notes for patient in SEED_PATIENTS)
    assert any(len(patient.notes) > 3 for patient in SEED_PATIENTS)
    assert len(SEED_PATIENTS) >= 20, "brief asks for 15-20 minimum"
