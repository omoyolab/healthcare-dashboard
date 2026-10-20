"""Settings shared by every test.

Database fixtures live in tests/integration/conftest.py, so unit tests do not
depend on infrastructure they never touch.
"""

import os

# Must happen before anything reads settings, so the app under test and Alembic
# both point at the throwaway database rather than the development one.
os.environ["POSTGRES_DB"] = "healthcare_test"
os.environ["SEED_ON_STARTUP"] = "false"
os.environ["APP_ENV"] = "test"

import pytest

from app.core.config import Settings, get_settings


@pytest.fixture(scope="session")
def settings() -> Settings:
    get_settings.cache_clear()
    return get_settings()
