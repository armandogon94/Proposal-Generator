# CLAUDE.md — Project 12: Client Proposal Generator

> **Port allocation:** See [PORTS.md](PORTS.md) before changing any docker-compose ports. All ports outside the assigned ranges are taken by other projects.

## Quick Reference

- **Project:** AI-Powered Client Proposal Generator for 305-ai.com
- **Subdomain:** proposals.305-ai.com
- **Owner:** Armando (single-user app, no multi-user auth)
- **Ports:** Frontend 3120, Backend 8120 (see PORT-MAP.md)
- **Database:** proposals_db on shared PostgreSQL 16, Redis DB #10

---

## Tech Stack

### Backend
- **Runtime:** Python 3.11+ with uv (package manager)
- **Framework:** FastAPI (async-first)
- **ORM:** SQLAlchemy 2.0 (async) + asyncpg driver
- **Database:** PostgreSQL 16
- **Migrations:** Alembic
- **Testing:** pytest + pytest-asyncio

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** TailwindCSS + Shadcn/UI
- **Forms:** React Hook Form + Zod validation
- **Testing:** vitest + React Testing Library

### AI & Export
- **LLM:** Claude Haiku 4.5 (drafts) / Sonnet 4.6 (complex/refinements) via Anthropic Python SDK
- **Structured Output:** `messages.parse()` with Pydantic models (constrained decoding)
- **PDF:** WeasyPrint (HTML/CSS → PDF with paged media CSS)
- **DOCX:** docxtpl (Jinja2-in-Word templates, built on python-docx)
- **Diagrams:** Self-hosted Kroki (primary) + Python mmdc package (fallback)

### Infrastructure
- **Containers:** Docker + Docker Compose
- **Proxy:** Traefik (automatic HTTPS)
- **VPS:** Hostinger Ubuntu 22.04 LTS
- **CI/CD:** GitHub Actions

---

## Project Structure

```
12-Proposal-Generator/
├── CLAUDE.md              # This file — project context
├── PLAN.md                # Full development plan (schemas, prompts, endpoints, specs)
├── AGENTS.md              # 7 specialist roles and quality checklists
├── PORT-MAP.md            # Port allocation across all projects
├── README.md              # GitHub-facing documentation
├── .claude/
│   ├── memory.md          # Persistent decisions, research findings, preferences
│   └── scratchpad.md      # Temporary working notes (current session)
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI app entry point
│   │   ├── config.py      # Settings (env vars, DB URL, API keys)
│   │   ├── dependencies.py
│   │   ├── api/           # Route handlers (clients, proposals, templates, pricing, dashboard)
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/      # Business logic (ai, pdf, docx, mermaid, proposal)
│   │   ├── database/      # Session factory + Alembic migrations
│   │   └── templates/     # HTML templates for PDF generation
│   ├── tests/
│   ├── pyproject.toml     # uv package config
│   └── Dockerfile
├── frontend/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components (wizard, editor, chat, pricing, diagrams)
│   ├── lib/               # API client, hooks, utils, constants
│   ├── styles/
│   ├── public/            # Logo, favicon, static assets
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── .github/workflows/     # CI/CD (lint, test, deploy)
```

---

## Development Commands

```bash
# Backend (from backend/)
uv sync                              # Install dependencies
uv run uvicorn app.main:app --reload --port 8120  # Dev server
uv run pytest                        # Run tests
uv run alembic upgrade head          # Apply migrations
uv run alembic revision --autogenerate -m "description"  # New migration

# Frontend (from frontend/)
npm install                          # Install dependencies
npm run dev -- -p 3120               # Dev server
npm run test                         # Run vitest
npm run build                        # Production build
npm run lint                         # ESLint

# Docker
docker compose up -d                 # Start all services
docker compose logs -f backend       # Tail backend logs
docker compose down                  # Stop all services
```

---

## Code Conventions

### Python (Backend)
- **Formatter:** Black (line-length 88)
- **Imports:** isort (profile=black)
- **Linter:** ruff
- **Types:** Type hints on ALL function signatures
- **Naming:** snake_case for functions/variables, PascalCase for classes
- **Async:** Use async/await throughout — no sync DB calls
- **Architecture:** routes → services → repositories → models (4-layer max)

### TypeScript (Frontend)
- **Strict mode** enabled
- **Naming:** camelCase for functions/variables, PascalCase for components/types
- **Components:** Functional components with hooks only
- **API calls:** Custom hooks in lib/hooks/ wrapping fetch
- **Validation:** Zod schemas matching backend Pydantic models

### Database
- **IDs:** UUID (gen_random_uuid())
- **Timestamps:** TIMESTAMPTZ (timezone-aware)
- **Money:** NUMERIC(12,2), never FLOAT
- **Flexible data:** JSONB for deliverables, timeline, package includes
- **Indexes:** Every FK + frequently queried columns

### Testing
- **Backend:** pytest-asyncio, httpx.AsyncClient, factory_boy fixtures
- **Frontend:** vitest, React Testing Library, user-event, MSW for API mocking
- **Naming:** test_<action>_<scenario>_<expected_result>
- **Coverage:** >80% for critical paths (AI service, pricing, export)

---

## Key Design Decisions

1. **Single-user app** — No auth system. Armando is the only user. Simple session-based approach if needed later.
2. **Haiku for drafts, Sonnet for high-value** — Cost optimization. User toggles model in UI.
3. **WeasyPrint over Puppeteer** — Pure Python, no headless browser dependency. Better for Docker.
4. **Streaming AI responses** — SSE (Server-Sent Events) for real-time draft generation and chat refinement.
5. **JSONB for flexible fields** — Deliverables, timeline milestones, and package includes stored as JSONB arrays for schema flexibility.
6. **Proposal numbering** — Counter table (gap-free, year-resetting): PROP-{YEAR}-{SEQ:04d} format.
7. **Structured outputs** — `messages.parse()` with Pydantic models, not raw text parsing or tool_use.
8. **Kroki for Mermaid** — Self-hosted Kroki containers (no Chromium in backend). Python mmdc as fallback.
9. **docxtpl for DOCX** — Jinja2-in-Word template approach, not raw python-docx.
10. **Prompt caching** — `cache_control={"type": "ephemeral"}` for 90% input cost savings on refinement sessions.

---

## Branding Constants

```
Company:     305 AI
URL:         305-ai.com
Email:       hello@305-ai.com
Primary:     #1E40AF (blue)
Secondary:   #0369A1 (darker blue)
Accent:      #FB923C (orange)
Text:        #1F2937 (dark gray)
Light BG:    #F9FAFB (light gray)
Font:        Inter, -apple-system, sans-serif
```

---

## Agent Roles (see AGENTS.md)

Before starting any task, identify applicable roles:
1. **Software Architect** — System design, API contracts, module boundaries
2. **UI/UX Designer** — Components, responsiveness, accessibility, states
3. **Test Engineer** — Test strategy, coverage, fixtures, CI
4. **DevOps Engineer** — Docker, Traefik, CI/CD, Makefile
5. **Security Engineer** — Input validation, CORS, secrets, rate limiting
6. **Database Administrator** — Schema design, indexes, migrations, queries
7. **Code Reviewer** — Style, naming, error handling, types, cleanup

Document significant decisions in `.claude/memory.md` with role context.

---

## Environment Variables

See `.env.example` for full list. Critical ones:
```
DATABASE_URL=postgresql+asyncpg://armando:{password}@localhost:5432/proposals_db
ANTHROPIC_API_KEY=sk-ant-...
ENVIRONMENT=development|production
REDIS_URL=redis://localhost:6379/10
```

---

## Reference Files

- **PLAN.md** — Full plan: DB schemas (SQL), AI prompts, API endpoints, frontend pages, PDF/DOCX specs, Docker Compose, timeline
- **AGENTS.md** — 7 specialist roles with quality checklists
- **PORT-MAP.md** — Port allocation across all 12+ projects

### Local Context (.claude/ directory — READ THESE FIRST in a new session)
- **.claude/memory.md** — Research findings, architectural decisions, preferences, gotchas
- **.claude/scratchpad.md** — Last session summary and resume point
- **.claude/session-history.md** — Chronological log of what was done and why
- **.claude/implementation-status.md** — File-by-file inventory, build status, known issues
- **.claude/next-steps.md** — Prioritized todo list for resuming work
