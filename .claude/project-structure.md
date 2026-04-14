# Project Structure

## Directory Tree

```
12-Proposal-Generator/
├── CLAUDE.md                          # This file — comprehensive context
├── PLAN.md                            # Full development plan (schemas, prompts, endpoints)
├── AGENTS.md                          # 7 specialist roles + quality checklists
├── PORT-MAP.md                        # Port allocation (3120 frontend, 8120 backend)
├── README.md                          # GitHub-facing documentation
│
├── .claude/                           # Persistent session context (READ FIRST)
│   ├── memory.md                      # Architectural decisions, research, gotchas
│   ├── scratchpad.md                  # Last session summary + resume point
│   ├── session-history.md             # Chronological log of work
│   ├── implementation-status.md       # File-by-file inventory + known issues
│   ├── next-steps.md                  # Prioritized todo list
│   ├── project-structure.md           # This file — full directory tree
│   ├── commands.md                    # All development commands, Makefile targets
│   ├── coding-conventions.md          # Python + TypeScript coding conventions
│   ├── architecture-decisions.md      # The architectural decisions table
│   ├── branding.md                    # Branding constants
│   ├── gotchas.md                     # Gotchas, known issues, testing gaps, deferred work
│   ├── workflows.md                   # Agent roles, common tasks, quick start
│   └── env-vars.md                    # Environment variables
│
├── backend/                           # FastAPI backend (Python)
│   ├── app/
│   │   ├── main.py                    # FastAPI app, CORS, route registration
│   │   ├── config.py                  # Settings from env vars
│   │   ├── dependencies.py            # get_db() + shared deps
│   │   │
│   │   ├── models/                    # SQLAlchemy 2.0 async models
│   │   │   ├── __init__.py            # Exports all models + Base class
│   │   │   ├── client.py              # Client ORM model
│   │   │   ├── proposal.py            # Proposal + nested models
│   │   │   ├── pricing.py             # PricingItem, PricingPackage
│   │   │   └── template.py            # ProposalTemplate
│   │   │
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   │   ├── client.py              # ClientCreate, ClientUpdate, ClientResponse
│   │   │   ├── proposal.py            # ProposalCreate, GenerateDraftRequest, etc.
│   │   │   ├── template.py            # TemplateCreate, TemplateResponse
│   │   │   └── pagination.py          # PaginationParams, PaginatedResponse
│   │   │
│   │   ├── api/                       # FastAPI route handlers (29 endpoints)
│   │   │   ├── clients.py             # CRUD: GET/POST /clients, etc.
│   │   │   ├── proposals.py           # Core: generate-draft (SSE), refine, export
│   │   │   ├── templates.py           # CRUD: GET/POST /templates
│   │   │   ├── pricing.py             # Pricing packages + line item calculations
│   │   │   └── dashboard.py           # Stats, pipeline, recent proposals
│   │   │
│   │   ├── services/                  # Business logic layer
│   │   │   ├── ai_service.py          # Claude integration: drafts + refinement
│   │   │   ├── pdf_service.py         # WeasyPrint: HTML → PDF with branding
│   │   │   ├── docx_service.py        # python-docx: DOCX generation
│   │   │   ├── mermaid_service.py     # Diagram generation + Kroki rendering
│   │   │   └── proposal_service.py    # Pricing calculator (totals, discounts)
│   │   │
│   │   ├── templates/                 # Document templates
│   │   │   ├── pdf_template.html      # Jinja2 template for WeasyPrint
│   │   │   └── email_templates/       # Future: email templates
│   │   │
│   │   ├── database/
│   │   │   ├── session.py             # Async engine, session factory, get_db()
│   │   │   └── migrations/            # Alembic migration files
│   │   │       ├── env.py             # Alembic async config
│   │   │       └── versions/          # Individual migrations (generated)
│   │   │
│   │   └── assets/                    # Branding assets (images, fonts)
│   │       ├── images/
│   │       │   ├── logo.png           # 305 AI logo
│   │       │   └── logo.svg           # SVG version
│   │       └── fonts/
│   │           ├── Inter-Regular.ttf
│   │           └── Inter-Bold.ttf
│   │
│   ├── tests/
│   │   ├── conftest.py                # Pytest fixtures + config
│   │   ├── test_api/                  # Integration tests (need PostgreSQL)
│   │   │   ├── test_clients.py
│   │   │   └── test_proposals.py
│   │   └── test_services/             # Unit tests (no DB needed)
│   │       ├── test_proposal_service.py   # Pricing logic
│   │       └── test_mermaid.py            # Diagram validation
│   │
│   ├── Dockerfile                     # Multi-stage: Python 3.12-slim + deps
│   ├── pyproject.toml                 # uv package config (use [dependency-groups])
│   └── alembic.ini                    # Alembic configuration
│
├── frontend/                          # Next.js frontend (TypeScript)
│   ├── app/                           # Next.js App Router (all routes here)
│   │   ├── layout.tsx                 # Root layout + navigation
│   │   ├── page.tsx                   # Dashboard (/)
│   │   │
│   │   ├── proposals/
│   │   │   ├── page.tsx               # List proposals (/proposals)
│   │   │   ├── new/
│   │   │   │   └── page.tsx           # Create wizard (/proposals/new)
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Editor + refinement (/proposals/[id])
│   │   │
│   │   ├── clients/
│   │   │   ├── page.tsx               # List clients (/clients)
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Client detail (/clients/[id])
│   │   │
│   │   ├── templates/
│   │   │   └── page.tsx               # Template manager (/templates)
│   │   │
│   │   └── settings/
│   │       └── page.tsx               # Settings (/settings)
│   │
│   ├── components/                    # React components
│   │   ├── navigation.tsx             # Top nav bar
│   │   └── ui/                        # Shadcn/UI components (15 total)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── textarea.tsx
│   │       ├── select.tsx
│   │       ├── badge.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── dialog.tsx
│   │       ├── sheet.tsx
│   │       ├── separator.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── skeleton.tsx
│   │       └── sonner.tsx
│   │
│   ├── lib/                           # Utilities + API client
│   │   ├── api.ts                     # Typed fetch wrappers for all endpoints
│   │   ├── types.ts                   # TypeScript types (match backend schemas)
│   │   └── utils.ts                   # cn() for Tailwind class merging
│   │
│   ├── public/                        # Static assets
│   │   ├── 305ai-logo.png
│   │   └── favicon.ico
│   │
│   ├── Dockerfile                     # Node 20-alpine + npm build
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json                  # Strict mode
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── vitest.config.ts               # Unit test config (TODO)
│
├── docker-compose.yml                 # 6 services: postgres, redis, backend, frontend, kroki, mermaid
├── docker-compose.prod.yml            # Production override (planned)
├── Makefile                           # 14 targets: dev, build, up, down, test, etc.
├── .env.example                       # Documented environment variables
├── .gitignore                         # Python, Node, env, Docker, IDE
│
└── .github/workflows/                 # CI/CD (TODO)
    ├── lint.yml                       # Ruff + ESLint
    ├── test.yml                       # pytest + vitest
    └── deploy.yml                     # Build + push images
```
