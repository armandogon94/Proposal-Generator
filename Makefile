.PHONY: dev dev-backend dev-frontend build up down logs test lint migrate seed clean

# Development
dev: up
	@echo "Stack running: frontend=http://localhost:3120 backend=http://localhost:8120"

dev-backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8120

dev-frontend:
	cd frontend && npm run dev -- -p 3120

# Docker
build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

# Database
migrate:
	cd backend && uv run alembic upgrade head

migration:
	cd backend && uv run alembic revision --autogenerate -m "$(MSG)"

# Testing
test: test-backend test-frontend

test-backend:
	cd backend && uv run pytest -v

test-frontend:
	cd frontend && npm run test

# Linting
lint: lint-backend lint-frontend

lint-backend:
	cd backend && uv run ruff check app/ && uv run black --check app/

lint-frontend:
	cd frontend && npm run lint

# Cleanup
clean:
	docker compose down -v
	rm -rf backend/exports/*
	rm -rf frontend/.next

# Seed data
seed:
	cd backend && uv run python -m app.seed
