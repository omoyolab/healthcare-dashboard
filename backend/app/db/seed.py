"""Idempotent seed data: 20 patients with clinical notes.

Chosen to exercise the UI rather than to look tidy - ages from infant to 90s,
all three statuses, missing optional fields, patients with no notes and one with
many, and names that collide on a search prefix.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ClinicalNote, Patient
from app.models.patient import BloodType, PatientStatus

logger = structlog.get_logger(__name__)


@dataclass(frozen=True, slots=True)
class SeedPatient:
    first_name: str
    last_name: str
    date_of_birth: date
    status: PatientStatus = PatientStatus.ACTIVE
    email: str | None = None
    phone: str | None = None
    address_line1: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    blood_type: BloodType | None = None
    allergies: tuple[str, ...] = ()
    conditions: tuple[str, ...] = ()
    # Relative to today, so the data stays current whenever it is seeded.
    last_visit_days_ago: int | None = None
    notes: tuple[tuple[int, str], ...] = field(default=())


SEED_PATIENTS: tuple[SeedPatient, ...] = (
    SeedPatient(
        first_name="Rosa",
        last_name="Delgado",
        date_of_birth=date(1981, 3, 14),
        email="rosa.delgado@example.com",
        phone="+1-415-555-0142",
        address_line1="1180 Mission St",
        city="San Francisco",
        state="CA",
        postal_code="94103",
        blood_type=BloodType.O_POSITIVE,
        allergies=("penicillin", "latex"),
        conditions=("type 2 diabetes",),
        last_visit_days_ago=17,
        notes=(
            (210, "Initial consultation. HbA1c 8.1%. Started on metformin 500mg twice daily."),
            (150, "Tolerating metformin well. Mild GI upset resolved after two weeks."),
            (96, "HbA1c down to 7.4%. Reports walking 30 minutes most days."),
            (54, "Routine review. Blood pressure 128/82. Continue current regimen."),
            (31, "Reports occasional morning dizziness. Advised to monitor and log readings."),
            (17, "Dizziness resolved. HbA1c 6.9%. Glucose control improved on current regimen."),
        ),
    ),
    SeedPatient(
        first_name="Marco",
        last_name="Rodriguez",
        date_of_birth=date(1972, 1, 9),
        email="m.rodriguez@example.com",
        phone="+1-415-555-0198",
        address_line1="44 Oakdale Ave",
        city="San Francisco",
        state="CA",
        postal_code="94124",
        blood_type=BloodType.A_NEGATIVE,
        allergies=("sulfa drugs",),
        conditions=("hypertension", "high cholesterol"),
        last_visit_days_ago=9,
        notes=(
            (88, "Blood pressure 148/94 on two readings. Starting lisinopril 10mg daily."),
            (41, "BP improved to 134/86. No cough reported."),
            (9, "BP 129/81. Lipid panel ordered for next visit."),
        ),
    ),
    SeedPatient(
        first_name="Rosalind",
        last_name="Okafor",
        date_of_birth=date(1993, 8, 5),
        email="rosalind.okafor@example.com",
        phone="+1-510-555-0117",
        address_line1="902 Telegraph Ave",
        city="Oakland",
        state="CA",
        postal_code="94607",
        blood_type=BloodType.B_POSITIVE,
        conditions=("asthma",),
        last_visit_days_ago=62,
        notes=(
            (62, "Seasonal asthma flare. Prescribed albuterol inhaler as needed."),
            (34, "Symptoms controlled. Peak flow within normal range."),
        ),
    ),
    SeedPatient(
        first_name="Amara",
        last_name="Nwosu",
        date_of_birth=date(2001, 4, 18),
        email="amara.nwosu@example.com",
        phone="+1-408-555-0163",
        address_line1="77 Winchester Blvd",
        city="San Jose",
        state="CA",
        postal_code="95128",
        blood_type=BloodType.AB_POSITIVE,
        allergies=("peanuts",),
        last_visit_days_ago=4,
        notes=(
            (4, "Annual physical. All findings within normal limits. Carries epinephrine pen."),
        ),
    ),
    SeedPatient(
        first_name="Henry",
        last_name="Whitfield",
        date_of_birth=date(1944, 2, 2),
        email="h.whitfield@example.com",
        phone="+1-415-555-0124",
        address_line1="310 Clement St",
        city="San Francisco",
        state="CA",
        postal_code="94118",
        blood_type=BloodType.O_NEGATIVE,
        allergies=("codeine",),
        conditions=("atrial fibrillation", "osteoarthritis"),
        last_visit_days_ago=23,
        notes=(
            (120, "Rate-controlled AF. Continuing apixaban. INR monitoring not required."),
            (23, "Knee pain limiting walking distance. Referred to physiotherapy."),
        ),
    ),
    SeedPatient(
        first_name="Priya",
        last_name="Raman",
        date_of_birth=date(1962, 5, 27),
        email="priya.raman@example.com",
        phone="+1-650-555-0188",
        address_line1="15 Woodside Rd",
        city="Redwood City",
        state="CA",
        postal_code="94061",
        blood_type=BloodType.A_POSITIVE,
        conditions=("hypothyroidism",),
        last_visit_days_ago=48,
        notes=((48, "TSH normalised on levothyroxine 75mcg. Repeat labs in six months."),),
    ),
    SeedPatient(
        first_name="Tobias",
        last_name="Lindqvist",
        date_of_birth=date(1953, 9, 15),
        email="t.lindqvist@example.com",
        phone="+1-415-555-0151",
        address_line1="88 Noe St",
        city="San Francisco",
        state="CA",
        postal_code="94114",
        blood_type=BloodType.B_NEGATIVE,
        conditions=("chronic kidney disease stage 3",),
        status=PatientStatus.INACTIVE,
        last_visit_days_ago=290,
        notes=((290, "eGFR stable at 48. Advised to avoid NSAIDs. Did not attend follow-up."),),
    ),
    SeedPatient(
        first_name="Noor",
        last_name="Haddad",
        date_of_birth=date(2009, 11, 30),
        phone="+1-415-555-0175",
        city="Daly City",
        state="CA",
        blood_type=BloodType.O_POSITIVE,
        allergies=("amoxicillin",),
        last_visit_days_ago=75,
        notes=((75, "Sports physical for school team. Cleared without restriction."),),
    ),
    SeedPatient(
        first_name="Elena",
        last_name="Vasquez",
        date_of_birth=date(1934, 7, 11),
        email="elena.vasquez@example.com",
        address_line1="2200 Geary Blvd",
        city="San Francisco",
        state="CA",
        postal_code="94115",
        blood_type=BloodType.A_POSITIVE,
        allergies=("aspirin", "shellfish"),
        conditions=("congestive heart failure", "type 2 diabetes", "cataracts"),
        last_visit_days_ago=11,
        notes=(
            (160, "Admitted briefly for fluid overload. Discharged on adjusted diuretic dose."),
            (74, "Weight stable. No ankle oedema. Daughter attends appointments."),
            (11, "Reports breathlessness climbing stairs. Echocardiogram ordered."),
        ),
    ),
    SeedPatient(
        first_name="Daniel",
        last_name="Osei",
        date_of_birth=date(2017, 6, 21),
        phone="+1-415-555-0133",
        address_line1="51 Dolores St",
        city="San Francisco",
        state="CA",
        postal_code="94103",
        blood_type=BloodType.AB_NEGATIVE,
        last_visit_days_ago=38,
        notes=((38, "Routine immunisations up to date. Growth tracking along 60th centile."),),
    ),
    SeedPatient(
        first_name="Sofia",
        last_name="Marchetti",
        date_of_birth=date(1988, 12, 4),
        email="sofia.marchetti@example.com",
        phone="+1-415-555-0109",
        address_line1="630 Valencia St",
        city="San Francisco",
        state="CA",
        postal_code="94110",
        blood_type=BloodType.O_POSITIVE,
        conditions=("migraine",),
        last_visit_days_ago=29,
        notes=(
            (112, "Migraine frequency four per month. Starting propranolol as prophylaxis."),
            (29, "Frequency down to one per month. Continuing current dose."),
        ),
    ),
    SeedPatient(
        first_name="Jonah",
        last_name="Berkowitz",
        date_of_birth=date(1976, 10, 22),
        email="j.berkowitz@example.com",
        phone="+1-415-555-0190",
        city="San Francisco",
        state="CA",
        blood_type=BloodType.A_NEGATIVE,
        allergies=("iodine contrast",),
        status=PatientStatus.DISCHARGED,
        last_visit_days_ago=400,
        notes=(
            (400, "Episode resolved. Discharged from service with advice to re-refer if needed."),
        ),
    ),
    SeedPatient(
        first_name="Mei",
        last_name="Tanaka",
        date_of_birth=date(1998, 2, 17),
        email="mei.tanaka@example.com",
        phone="+1-415-555-0146",
        address_line1="1455 Market St",
        city="San Francisco",
        state="CA",
        postal_code="94103",
        blood_type=BloodType.B_POSITIVE,
        last_visit_days_ago=2,
        notes=((2, "New patient registration. No significant medical history reported."),),
    ),
    SeedPatient(
        first_name="Olumide",
        last_name="Adeyemi",
        date_of_birth=date(1969, 6, 8),
        email="o.adeyemi@example.com",
        phone="+1-510-555-0172",
        address_line1="340 Grand Ave",
        city="Oakland",
        state="CA",
        postal_code="94610",
        blood_type=BloodType.O_NEGATIVE,
        conditions=("sickle cell trait", "hypertension"),
        last_visit_days_ago=19,
        notes=(
            (82, "BP 142/90. Lifestyle measures discussed before starting medication."),
            (19, "BP 131/84 after dietary changes. Review in three months."),
        ),
    ),
    SeedPatient(
        first_name="Catherine",
        last_name="Byrne",
        date_of_birth=date(1957, 3, 30),
        email="c.byrne@example.com",
        phone="+1-415-555-0181",
        address_line1="19 Cole St",
        city="San Francisco",
        state="CA",
        postal_code="94117",
        blood_type=BloodType.A_POSITIVE,
        allergies=("ibuprofen",),
        conditions=("rheumatoid arthritis",),
        last_visit_days_ago=35,
        notes=(
            (190, "Methotrexate commenced with folic acid cover. Baseline bloods normal."),
            (35, "Joint swelling reduced. Liver function monitoring continues."),
        ),
    ),
    SeedPatient(
        first_name="Felix",
        last_name="Nakamura",
        date_of_birth=date(2025, 12, 2),
        phone="+1-415-555-0127",
        address_line1="700 Irving St",
        city="San Francisco",
        state="CA",
        postal_code="94122",
        blood_type=BloodType.O_POSITIVE,
        last_visit_days_ago=6,
        notes=((6, "Six-month check. Feeding well, weight gain appropriate."),),
    ),
    SeedPatient(
        first_name="Yara",
        last_name="Mansour",
        date_of_birth=date(1991, 9, 3),
        email="yara.mansour@example.com",
        phone="+1-415-555-0115",
        city="San Francisco",
        state="CA",
        blood_type=BloodType.AB_POSITIVE,
        allergies=("pollen",),
        conditions=("allergic rhinitis",),
        last_visit_days_ago=140,
    ),
    SeedPatient(
        first_name="Gregory",
        last_name="Mbeki",
        date_of_birth=date(1948, 11, 19),
        email="g.mbeki@example.com",
        address_line1="2800 Fulton St",
        city="San Francisco",
        state="CA",
        postal_code="94118",
        blood_type=BloodType.B_NEGATIVE,
        conditions=("COPD",),
        status=PatientStatus.INACTIVE,
        last_visit_days_ago=320,
    ),
    SeedPatient(
        first_name="Isabelle",
        last_name="Fournier",
        date_of_birth=date(1984, 5, 12),
        email="i.fournier@example.com",
        phone="+1-650-555-0154",
        address_line1="120 El Camino Real",
        city="Menlo Park",
        state="CA",
        postal_code="94025",
        blood_type=BloodType.A_NEGATIVE,
    ),
    SeedPatient(
        first_name="Samuel",
        last_name="Adeyinka",
        date_of_birth=date(2013, 8, 27),
        phone="+1-415-555-0168",
        city="San Francisco",
        state="CA",
    ),
)


async def seed_if_empty(session: AsyncSession) -> int:
    """Insert seed data when the table is empty. Returns rows created.

    Assumes one API instance starts at a time, which is true for this stack:
    compose runs a single api service. Two instances starting together could
    both see an empty table and both insert. The fix would be an advisory lock
    or moving seeding into the one-shot migrate service; neither is worth the
    machinery for development data.
    """
    existing = await session.scalar(select(func.count()).select_from(Patient))
    if existing:
        # Never truncate: restarting the stack must not destroy local data.
        logger.info("seed.skipped", patients=existing)
        return 0

    now = datetime.now(UTC)
    for seed in SEED_PATIENTS:
        patient = Patient(
            first_name=seed.first_name,
            last_name=seed.last_name,
            date_of_birth=seed.date_of_birth,
            email=seed.email,
            phone=seed.phone,
            address_line1=seed.address_line1,
            city=seed.city,
            state=seed.state,
            postal_code=seed.postal_code,
            blood_type=seed.blood_type,
            allergies=list(seed.allergies),
            conditions=list(seed.conditions),
            status=seed.status,
            last_visit_at=(
                now - timedelta(days=seed.last_visit_days_ago)
                if seed.last_visit_days_ago is not None
                else None
            ),
        )
        patient.notes = [
            ClinicalNote(authored_at=now - timedelta(days=days_ago), content=content)
            for days_ago, content in seed.notes
        ]
        session.add(patient)

    await session.flush()
    logger.info("seed.completed", patients=len(SEED_PATIENTS))
    return len(SEED_PATIENTS)


async def _main() -> None:
    from app.core.config import get_settings
    from app.core.logging import configure_logging
    from app.db.session import Database

    settings = get_settings()
    configure_logging(settings)
    database = Database(settings.sqlalchemy_dsn)
    try:
        async with database.session() as session:
            await seed_if_empty(session)
    finally:
        await database.dispose()


if __name__ == "__main__":
    asyncio.run(_main())
