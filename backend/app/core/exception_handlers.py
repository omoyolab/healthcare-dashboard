"""Every error leaves through here, in one body shape (RFC 9457).

Services raise domain errors; this module owns the status codes.
"""

from typing import Any

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.core.errors import (
    ConflictError,
    DomainError,
    NotFoundError,
    ServiceUnavailableError,
)
from app.core.middleware import REQUEST_ID_HEADER

logger = structlog.get_logger(__name__)

PROBLEM_JSON = "application/problem+json"

STATUS_BY_TYPE: list[tuple[type[DomainError], int, str]] = [
    (NotFoundError, 404, "/errors/not-found"),
    (ConflictError, 409, "/errors/conflict"),
    (ServiceUnavailableError, 503, "/errors/unavailable"),
    (DomainError, 400, "/errors/bad-request"),
]


def _problem(
    request: Request,
    *,
    status: int,
    type_url: str,
    title: str,
    detail: str,
    errors: list[dict[str, str]] | None = None,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    body: dict[str, Any] = {
        "type": type_url,
        "title": title,
        "status": status,
        "detail": detail,
        "instance": request.url.path,
        "request_id": request_id,
    }
    if errors:
        body["errors"] = errors
    # Set here rather than relying on the middleware: a 500 response is built
    # outside it, and the header should be on every error without exception.
    headers = {REQUEST_ID_HEADER: request_id} if request_id else None
    return JSONResponse(status_code=status, content=body, media_type=PROBLEM_JSON, headers=headers)


async def handle_domain_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, DomainError)
    status, type_url = next(
        (status, url) for error_type, status, url in STATUS_BY_TYPE if isinstance(exc, error_type)
    )
    return _problem(request, status=status, type_url=type_url, title=exc.title, detail=exc.detail)


async def handle_validation_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    # Flatten Pydantic's loc tuples into field names the frontend can map
    # straight onto form inputs: ("body", "date_of_birth") -> "date_of_birth".
    errors = [
        {
            "field": ".".join(
                str(part) for part in error["loc"] if part not in ("body", "query", "path")
            )
            or "request",
            "message": error["msg"],
        }
        for error in exc.errors()
    ]
    count = len(errors)
    return _problem(
        request,
        status=422,
        type_url="/errors/validation-error",
        title="Validation failed",
        detail=f"{count} field{'s' if count != 1 else ''} {'are' if count != 1 else 'is'} invalid.",
        errors=errors,
    )


async def handle_http_exception(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, HTTPException)
    return _problem(
        request,
        status=exc.status_code,
        type_url=f"/errors/http-{exc.status_code}",
        title=str(exc.detail),
        detail=str(exc.detail),
    )


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    # Generic body: a leaked stack trace or database message from a system
    # holding patient data is an incident. The detail goes to the logs.
    logger.exception("request.unhandled_error", path=request.url.path)
    return _problem(
        request,
        status=500,
        type_url="/errors/internal",
        title="Internal server error",
        detail="An unexpected error occurred. Quote the request_id when reporting it.",
    )


def install_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, handle_domain_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(HTTPException, handle_http_exception)
    app.add_exception_handler(Exception, handle_unexpected_error)
