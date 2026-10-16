"""Health endpoints: liveness for the process, readiness for its dependencies."""

from typing import Any, Literal

import structlog
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.api.deps import SessionDep
from app.core.errors import ServiceUnavailableError
from app.schemas.common import ProblemDetail

router = APIRouter(tags=["health"])

logger = structlog.get_logger(__name__)

UNAVAILABLE: dict[int | str, dict[str, Any]] = {
    503: {"model": ProblemDetail, "description": "A dependency is unreachable"}
}


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


class ReadinessResponse(BaseModel):
    status: Literal["ready"] = "ready"
    database: Literal["ok"] = "ok"


@router.get("/health", response_model=HealthResponse, summary="Liveness probe")
async def health() -> HealthResponse:
    # No database call on purpose: this answers "is the process up", and a
    # database blip must not make Docker restart a healthy API.
    return HealthResponse()


@router.get("/health/ready", responses=UNAVAILABLE, summary="Readiness probe")
async def readiness(session: SessionDep) -> ReadinessResponse:
    """Can this instance serve traffic - i.e. is the database reachable?"""
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:
        # 503 so a load balancer stops sending traffic here, rather than the
        # 500 an unhandled error would produce.
        logger.warning("readiness.database_unreachable", error=str(exc))
        raise ServiceUnavailableError("database is not reachable") from exc
    return ReadinessResponse()
