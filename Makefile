# One entrypoint for every common task, so nobody has to remember a
# docker compose incantation. CI calls these same targets.

COMPOSE := docker compose
BACKEND  := $(COMPOSE) run --rm --no-deps api

.DEFAULT_GOAL := help
.PHONY: help up down reset logs ps build migrate migration downgrade seed psql \
        shell install test test-backend test-frontend test-e2e lint lint-backend \
        lint-frontend fmt bulk-seed

help: ## Show this help
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

up: ## Start the whole stack (migrates and seeds automatically)
	$(COMPOSE) up --build -d
	@echo "web  -> http://localhost:5173"
	@echo "api  -> http://localhost:8000/docs"
	@echo "logs -> make logs"

down: ## Stop the stack, keep the data
	$(COMPOSE) down

reset: ## Stop the stack and delete the database volume
	$(COMPOSE) down -v

logs: ## Tail logs for every service
	$(COMPOSE) logs -f

ps: ## Show service status
	$(COMPOSE) ps

build: ## Rebuild images
	$(COMPOSE) build

migrate: ## Apply migrations
	$(COMPOSE) run --rm migrate

migration: ## Autogenerate a revision: make migration m="add referral source"
	@test -n "$(m)" || (echo "usage: make migration m=\"message\""; exit 1)
	$(BACKEND) alembic revision --autogenerate -m "$(m)"

downgrade: ## Roll back one revision
	$(BACKEND) alembic downgrade -1

seed: ## Seed the database (no-op when it already has data)
	$(BACKEND) python -m app.db.seed

psql: ## Open a psql shell
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-healthcare}

shell: ## Open a shell in the api container
	$(BACKEND) bash

install: ## Install local toolchains (the stack itself only needs Docker)
	cd backend && python3 -m venv .venv && .venv/bin/pip install -q -e ".[dev]"
	cd frontend && npm ci

test: test-backend test-frontend ## Run both unit suites

test-backend: ## pytest (needs the db service running)
	cd backend && .venv/bin/pytest

test-frontend: ## vitest
	cd frontend && npx vitest run

test-e2e: ## playwright against the running stack
	cd frontend && npx playwright test

lint: lint-backend lint-frontend ## Lint and typecheck everything

lint-backend:
	cd backend && .venv/bin/ruff check app migrations tests scripts
	cd backend && .venv/bin/ruff format --check app migrations tests scripts
	cd backend && .venv/bin/mypy app tests

lint-frontend:
	cd frontend && npx eslint . --max-warnings=0
	cd frontend && npx tsc --noEmit
	cd frontend && npx prettier --check src e2e

fmt: ## Format everything
	cd backend && .venv/bin/ruff format app migrations tests scripts
	cd backend && .venv/bin/ruff check --fix app migrations tests scripts
	cd frontend && npx prettier --write src e2e

bulk-seed: ## Load N patients for profiling: make bulk-seed n=5000
	cd backend && .venv/bin/python -m scripts.bulk_seed $(or $(n),5000)
