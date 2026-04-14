# Development Commands & Makefile Targets

## Backend Setup & Running

```bash
# Install dependencies (in backend/)
uv sync

# Run development server (with auto-reload)
uv run uvicorn app.main:app --reload --port 8120

# Run tests
uv run pytest                           # All tests
uv run pytest tests/test_services/     # Service tests only (no DB needed)
uv run pytest tests/test_api/          # API tests (needs PostgreSQL)
uv run pytest --cov=app                # With coverage report

# Database migrations
uv run alembic revision --autogenerate -m "description"  # Create migration
uv run alembic upgrade head                              # Apply migration
uv run alembic downgrade -1                              # Rollback
```

## Frontend Setup & Running

```bash
# Install dependencies (in frontend/)
npm install

# Run development server
npm run dev -- -p 3120

# Build for production
npm run build

# Start production build
npm run start

# Run tests (when implemented)
npm run test

# Linting
npm run lint
```

## Docker (Full Stack)

```bash
# Start all services (from project root)
make up
# or: docker compose up -d

# Tail logs
make logs
# or: docker compose logs -f backend

# Stop services
make down
# or: docker compose down

# Fresh build + start
docker compose up -d --build

# Run Alembic in backend container
docker compose exec backend uv run alembic revision --autogenerate -m "init"
docker compose exec backend uv run alembic upgrade head

# Access PostgreSQL
docker compose exec postgres psql -U armando -d proposals_db

# Access Redis
docker compose exec redis redis-cli

# Check Kroki health
curl http://localhost:8125/actuator/health
```

## Makefile Targets

```bash
make dev              # Start dev servers (both backend and frontend)
make build            # Docker compose build all services
make up               # Docker compose up -d
make down             # Docker compose down
make logs             # Tail all logs
make test             # pytest + frontend tests
make lint             # ruff + eslint
make migrate          # Alembic upgrade head
make migration MSG=   # Create new migration
make clean            # Remove build artifacts
make seed             # Populate test data (when implemented)
```
