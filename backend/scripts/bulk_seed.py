"""Load a large patient set for profiling.

Development tool, not part of the shipped seed: it exists so the performance
numbers in the README can be reproduced.

    python -m scripts.bulk_seed 5000
"""

import asyncio
import random
import sys
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import insert

from app.core.config import get_settings
from app.db.session import Database
from app.models.patient import Patient, PatientStatus

BATCH = 1000
FIRST = ["Ada", "Marco", "Rosa", "Mei", "Olumide", "Priya", "Tobias", "Yara", "Felix", "Noor"]
LAST = ["Delgado", "Rodriguez", "Okafor", "Tanaka", "Adeyemi", "Raman", "Byrne", "Mansour"]
CONDITIONS = ["asthma", "type 2 diabetes", "hypertension", "migraine", "COPD"]


def rows(count: int, offset: int) -> list[dict[str, object]]:
    now = datetime.now(UTC)
    random.seed(offset)
    return [
        {
            "first_name": random.choice(FIRST),
            "last_name": f"{random.choice(LAST)}{offset + index}",
            "date_of_birth": date(1940, 1, 1) + timedelta(days=random.randint(0, 30000)),
            "email": f"load{offset + index}@example.com",
            "status": random.choice(list(PatientStatus)),
            "last_visit_at": now - timedelta(days=random.randint(0, 900)),
            "allergies": random.sample(["latex", "penicillin", "pollen"], k=random.randint(0, 2)),
            "conditions": random.sample(CONDITIONS, k=random.randint(0, 2)),
        }
        for index in range(count)
    ]


async def main(total: int) -> None:
    database = Database(get_settings().sqlalchemy_dsn)
    try:
        for offset in range(0, total, BATCH):
            size = min(BATCH, total - offset)
            async with database.session() as session:
                await session.execute(insert(Patient), rows(size, offset))
            print(f"inserted {offset + size}/{total}", flush=True)
    finally:
        await database.dispose()


if __name__ == "__main__":
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 5000))
