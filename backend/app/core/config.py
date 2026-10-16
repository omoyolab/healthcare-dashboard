"""Typed application settings, loaded from the environment once at startup."""

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

Environment = Literal["development", "production", "test"]
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Repo-root .env is the shared one; a backend/.env can override it for
        # local experiments. Real environment variables still win over both.
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: Environment = "development"
    log_level: LogLevel = "INFO"
    api_v1_prefix: str = "/api/v1"

    postgres_user: str = "postgres"
    postgres_password: SecretStr = SecretStr("postgres")
    postgres_db: str = "healthcare"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    # Set this to override the five parts above (what docker-compose passes).
    database_url: str | None = None

    db_pool_size: int = Field(default=5, ge=1)
    db_max_overflow: int = Field(default=10, ge=0)
    db_echo: bool = False

    # NoDecode turns off the JSON decoding that .env sources apply to list
    # fields; without it "a,b" fails before the validator below ever runs.
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]
    seed_on_startup: bool = True

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def sqlalchemy_dsn(self) -> str:
        if self.database_url:
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        password = self.postgres_password.get_secret_value()
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached so the environment is parsed once; tests build Settings() directly."""
    return Settings()
