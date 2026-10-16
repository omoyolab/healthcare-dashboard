"""Liveness endpoint and app wiring."""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


# These cover HTTP wiring only, so startup seeding stays off: a test that needs
# a database running to check a route is a test that fails for the wrong reason.
def _settings(**overrides: object) -> Settings:
    values: dict[str, object] = {"app_env": "test", "seed_on_startup": False}
    values.update(overrides)
    return Settings(**values)  # type: ignore[arg-type]


def test_health_returns_ok() -> None:
    app = create_app(_settings())
    # The context manager runs startup/shutdown, so this also covers lifespan.
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_schema_is_served_outside_production() -> None:
    app = create_app(_settings(app_env="development"))
    with TestClient(app) as client:
        assert client.get("/openapi.json").status_code == 200


def test_docs_are_disabled_in_production() -> None:
    app = create_app(_settings(app_env="production"))
    with TestClient(app) as client:
        assert client.get("/docs").status_code == 404


def test_readiness_reports_the_database(client: TestClient) -> None:
    response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ok"}


def test_readiness_is_503_when_the_database_is_unreachable() -> None:
    # Liveness must still pass while readiness fails: the process is fine, its
    # dependency is not.
    app = create_app(_settings(postgres_port=59999))
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
        response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json()["type"] == "/errors/unavailable"
