# Workflows & Common Tasks

## Quick Start (Local Development)

### 1. Clone and navigate
```bash
cd 12-Proposal-Generator
cp .env.example .env
# Edit .env: add ANTHROPIC_API_KEY, set DB_PASSWORD
```

### 2. Start Docker Compose
```bash
make up
# Wait for postgres to be healthy (15-20 seconds)
```

### 3. Run migrations
```bash
docker compose exec backend uv run alembic revision --autogenerate -m "initial"
docker compose exec backend uv run alembic upgrade head
```

### 4. Create placeholder assets
```bash
# Need these for PDF/DOCX export:
mkdir -p backend/assets/images backend/assets/fonts
# Place 305ai-logo.png and Inter fonts in these dirs
```

### 5. Open the app
- Frontend: http://localhost:3120
- Backend docs: http://localhost:8120/docs
- Traefik dashboard: http://localhost:8180

### 6. Smoke test
1. Create a client (Clients page)
2. Create a proposal (New Proposal wizard)
3. Generate AI draft (Generate Draft button)
4. Refine a section (chat panel on right)
5. Export PDF/DOCX
6. Check public view link

---

## Agent Roles

When starting work, identify applicable specialist roles from AGENTS.md:

1. **Software Architect** — API contracts, module boundaries, data flow, design patterns
2. **UI/UX Designer** — Component design, responsive layouts, accessibility, user flows
3. **Test Engineer** — Test strategy, coverage, fixtures, CI integration
4. **DevOps Engineer** — Docker, Traefik, CI/CD, health checks, logging
5. **Security Engineer** — Input validation, CORS, rate limiting, secrets, auth (future)
6. **Database Administrator** — Schema design, indexes, migrations, query optimization
7. **Code Reviewer** — Style, naming, error handling, types, documentation

Document significant architectural decisions in `.claude/memory.md` with role context.

---

## Common Tasks

### Add a new API endpoint

1. Define Pydantic schema in `backend/app/schemas/`
2. Add SQLAlchemy model if needed in `backend/app/models/`
3. Add route handler in `backend/app/api/`
4. Add tests in `backend/tests/test_api/`
5. Document in PLAN.md § API ENDPOINTS
6. Commit: `feat(api): add new endpoint /path/to/endpoint`

### Add a frontend page

1. Create `app/<route>/page.tsx` with "use client" directive
2. Add types in `lib/types.ts` if needed
3. Add API calls in `lib/api.ts`
4. Add navigation link in `components/navigation.tsx`
5. Add tests in `app/<route>/__tests__/` (vitest)
6. Commit: `feat(ui): add <route> page`

### Fix a bug

1. Write a failing test first (TDD)
2. Implement fix
3. Verify test passes
4. Check no regressions: `make test`
5. Commit: `fix(module): brief description of what was wrong`

### Optimize a query

1. Measure: `EXPLAIN ANALYZE SELECT ...`
2. Add indexes if needed
3. Create Alembic migration: `uv run alembic revision -m "add index on column"`
4. Test locally with `docker compose exec postgres`
5. Document in .claude/memory.md with performance metrics
6. Commit: `perf(db): optimize query by adding index on column`
