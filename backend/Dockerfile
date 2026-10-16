# Dependencies are installed into a venv in the builder, then copied into a
# clean runtime image: no pip, no build tooling, no caches in the final layer.
FROM python:3.14-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Only the lock file, so dependency layers are reused when app code changes.
COPY requirements.lock ./
RUN pip install -r requirements.lock


FROM python:3.14-slim AS runtime

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN useradd --create-home --uid 10001 appuser

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
COPY --chown=appuser:appuser pyproject.toml alembic.ini ./
COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser migrations ./migrations

USER appuser
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
