"""Application factory and ASGI entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.exception_handlers import install_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.db.seed import seed_if_empty
from app.db.session import Database

logger = structlog.get_logger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build an app instance. Tests pass their own settings for isolation."""
    settings = settings or get_settings()
    configure_logging(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.settings = settings
        app.state.db = Database(
            settings.sqlalchemy_dsn,
            echo=settings.db_echo,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
        )
        logger.info("application.startup", env=settings.app_env, log_level=settings.log_level)

        if settings.seed_on_startup:
            # Idempotent, so this is a no-op once data exists. Schema changes are
            # the migrate step's job, not the app's.
            async with app.state.db.session() as session:
                await seed_if_empty(session)

        try:
            yield
        finally:
            await app.state.db.dispose()
            logger.info("application.shutdown")

    app = FastAPI(
        title="Healthcare Dashboard API",
        version="0.1.0",
        lifespan=lifespan,
        # Schema and docs are development affordances, not public surface.
        docs_url=None if settings.is_production else "/docs",
        openapi_url=None if settings.is_production else "/openapi.json",
        redoc_url=None,
    )

    # Added first so it is outermost: every request gets an id, including
    # ones rejected by CORS or validation.
    app.add_middleware(RequestContextMiddleware)

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    install_exception_handlers(app)

    app.include_router(health_router)
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


# uvicorn targets this; tests call create_app() instead of importing it.
app = create_app()
