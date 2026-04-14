# Implementation Status — Proposal Generator

> Complete inventory of what was built, verified status, and what remains.
> Last updated: 2026-04-02

---

## Build Verification (2026-04-02)

| Check | Status | Notes |
|-------|--------|-------|
| Backend `uv sync` | PASS | 75 packages installed, Python 3.13.9 |
| Backend `pytest tests/test_services/` | PASS | 11/11 tests passing in 0.62s |
| Frontend `npm run build` | PASS | 0 TypeScript errors, 9 routes generated |
| Frontend `npm install` | PASS | All deps including Shadcn/UI components |
| Docker Compose | NOT TESTED | File created but not `docker compose up` tested |
| Alembic migrations | NOT TESTED | Needs running PostgreSQL instance |
| API endpoints | NOT TESTED | Needs running PostgreSQL + backend server |
| AI generation | NOT TESTED | Needs ANTHROPIC_API_KEY in .env |
| PDF export | NOT TESTED | WeasyPrint needs system libs (`brew install pango gdk-pixbuf gobject-introspection`) |
| DOCX export | NOT TESTED | Needs proposal with sections in DB |
| Mermaid rendering | NOT TESTED | Needs Kroki containers running |

---

## Backend Files (37 Python files)

### Core Application
| File | Purpose | Status |
|------|---------|--------|
| `app/main.py` | FastAPI app entry, CORS, route registration, health endpoint | DONE |
| `app/config.py` | Pydantic Settings from env vars (DB, AI, branding, CORS) | DONE |
| `app/dependencies.py` | Re-exports `get_db` | DONE |

### Models (SQLAlchemy 2.0 async)
| File | Tables | Status |
|------|--------|--------|
| `app/models/client.py` | `clients` | DONE |
| `app/models/proposal.py` | `proposals`, `proposal_sections`, `proposal_status_history`, `proposal_diagrams`, `refinement_conversations`, `proposal_views` | DONE |
| `app/models/pricing.py` | `pricing_items`, `pricing_packages` | DONE |
| `app/models/template.py` | `proposal_templates` | DONE |
| `app/models/__init__.py` | Exports all models | DONE |

### Pydantic Schemas
| File | Schemas | Status |
|------|---------|--------|
| `app/schemas/client.py` | ClientBase, ClientCreate, ClientUpdate, ClientResponse, ClientListResponse | DONE |
| `app/schemas/proposal.py` | ProposalCreate/Update/Response/ListResponse, PricingItemBase/Create/Response, ProposalSectionResponse/Update, DiagramResponse, StatusHistoryResponse, RefinementRequest/Response, ConversationResponse, GenerateDraftRequest, ExportResponse, DashboardStats, RecentProposal | DONE |
| `app/schemas/template.py` | TemplateBase, TemplateCreate, TemplateUpdate, TemplateResponse | DONE |
| `app/schemas/pagination.py` | PaginationParams, PaginatedResponse | DONE |

### API Routes
| File | Endpoints | Status |
|------|-----------|--------|
| `app/api/clients.py` | GET /clients, POST /clients, GET /clients/{id}, PUT /clients/{id}, DELETE /clients/{id} (5 total, with search) | DONE |
| `app/api/proposals.py` | GET/POST /proposals, GET/PUT/DELETE /proposals/{id}, POST generate-draft (SSE streaming), POST sections/{type}, POST refine, POST export-pdf, POST export-docx, POST diagrams, POST send, GET conversations, GET view/{token} (12 total) | DONE |
| `app/api/templates.py` | GET/POST /templates, GET/PUT/DELETE /templates/{id} (5 total) | DONE |
| `app/api/pricing.py` | GET/POST /pricing-packages, PUT /proposals/{id}/pricing (3 total) | DONE |
| `app/api/dashboard.py` | GET /dashboard/stats, GET /dashboard/recent-proposals, GET /dashboard/clients-pipeline (3 total) | DONE |

### Services
| File | Functionality | Status |
|------|---------------|--------|
| `app/services/ai_service.py` | AIService class: `generate_proposal_stream()` (async SSE), `parse_proposal_sections()` (regex parser), `refine_section()` (section-aware refinement with context + dependency map). System prompts for generation and refinement. | DONE |
| `app/services/pdf_service.py` | PDFService: Jinja2 + WeasyPrint. Loads `pdf_template.html`, renders with branding vars, calculates subtotals. | DONE |
| `app/services/docx_service.py` | DOCXService: python-docx with cover page, styled headings, pricing table with cell shading, footer, logo embedding. | DONE |
| `app/services/mermaid_service.py` | MermaidService: `generate_diagrams()` (architecture + Gantt via Claude), `validate_and_fix_mermaid()` (smart quotes, dashes, fences), `_render_svg()` (Kroki HTTP POST). Prompt templates for architecture and Gantt diagrams. | DONE |
| `app/services/proposal_service.py` | `calculate_totals()` — pricing calculator with subtotal, discount items, percentage discount, optional item handling. | DONE |

### Templates
| File | Purpose | Status |
|------|---------|--------|
| `app/templates/pdf_template.html` | Full HTML/CSS template with @page rules, cover page, section rendering, pricing table, diagram embedding, signature block | DONE |

### Database & Migrations
| File | Purpose | Status |
|------|---------|--------|
| `app/database/session.py` | Async engine, session factory, Base class, `get_db()` dependency | DONE |
| `app/database/migrations/env.py` | Alembic async migration env | DONE |
| `app/database/migrations/script.py.mako` | Migration template | DONE |
| `alembic.ini` | Alembic configuration | DONE |

### Tests
| File | Tests | Status |
|------|-------|--------|
| `tests/test_services/test_proposal_service.py` | 6 tests: simple totals, discount items, percentage discount, optional unselected, optional selected, empty | PASSING |
| `tests/test_services/test_mermaid.py` | 5 tests: remove fences, smart quotes, em dashes, clean code, complex diagram | PASSING |
| `tests/test_api/test_clients.py` | 8 tests: create, duplicate email, list, get, update, archive, not found, search | WRITTEN (needs PostgreSQL) |
| `tests/test_api/test_proposals.py` | 7 tests: create, list, get, status transition, invalid transition, send, filter by status | WRITTEN (needs PostgreSQL) |
| `tests/conftest.py` | Minimal — service tests don't need DB. API tests need PostgreSQL (can't use SQLite due to JSONB). | NOTE |

---

## Frontend Files (28 TypeScript files)

### Pages (App Router)
| Route | File | Description | Status |
|-------|------|-------------|--------|
| `/` | `app/page.tsx` | Dashboard: stats cards (total, pending, accepted, pipeline), recent proposals list | DONE |
| `/proposals` | `app/proposals/page.tsx` | Filterable proposals table with status badges, amounts, dates | DONE |
| `/proposals/new` | `app/proposals/new/page.tsx` | 4-step wizard: client selection → project details → pricing items → review | DONE |
| `/proposals/[id]` | `app/proposals/[id]/page.tsx` | 3-column editor: section outline (left), content with edit/save (center), chat refinement (right). Top action bar: generate draft (SSE), export PDF/DOCX, send, diagrams. | DONE |
| `/clients` | `app/clients/page.tsx` | Searchable client list with create dialog | DONE |
| `/clients/[id]` | `app/clients/[id]/page.tsx` | Client detail: info card (editable), proposal history | DONE |
| `/templates` | `app/templates/page.tsx` | Template grid with create/delete | DONE |
| `/settings` | `app/settings/page.tsx` | Read-only branding, AI model, and export settings display | DONE |

### Components
| File | Purpose | Status |
|------|---------|--------|
| `components/navigation.tsx` | Top nav bar: logo, nav links (Dashboard, Proposals, Clients, Templates, Settings), "New Proposal" CTA | DONE |
| `components/ui/*.tsx` | 15 Shadcn/UI components (button, card, input, label, textarea, select, badge, table, tabs, dialog, sheet, separator, dropdown-menu, skeleton, sonner) | DONE |

### Library
| File | Purpose | Status |
|------|---------|--------|
| `lib/api.ts` | API client: `clientsAPI`, `proposalsAPI`, `templatesAPI`, `pricingAPI`, `dashboardAPI` — all typed fetch wrappers | DONE |
| `lib/types.ts` | Full TypeScript types matching backend Pydantic schemas | DONE |
| `lib/utils.ts` | `cn()` utility for Tailwind class merging (from Shadcn) | DONE |

---

## Infrastructure Files

| File | Purpose | Status |
|------|---------|--------|
| `docker-compose.yml` | 6 services: postgres, backend, frontend, redis, kroki, mermaid | DONE |
| `backend/Dockerfile` | Python 3.12-slim + WeasyPrint system deps + uv | DONE |
| `frontend/Dockerfile` | Node 20-alpine, npm install, dev mode | DONE |
| `.env.example` | All env vars documented | DONE |
| `Makefile` | 14 targets: dev, build, up, down, logs, migrate, migration, test, lint, clean, seed | DONE |
| `.gitignore` | Python, Node, env, IDE, OS, Docker, certs | DONE |
| `README.md` | Professional GitHub README with architecture, setup, API overview, deployment | DONE |

---

## What Was NOT Built (Future Work)

### From PLAN.md that's deferred:
1. **Alembic initial migration** — Need running PostgreSQL to autogenerate
2. **Seed data script** — `app/seed.py` referenced in Makefile but not created
3. **GitHub Actions CI/CD** — `.github/workflows/` directory exists but no workflow files
4. **Traefik production config** — `traefik.yml` not created
5. **Frontend vitest setup** — No test files yet for frontend components
6. **Logo/branding assets** — `backend/assets/images/logo.png` placeholder needed
7. **Email templates** — `backend/app/templates/email_templates/` directory exists but empty
8. **Notification worker** — Outbox pattern designed but no background worker implemented
9. **docxtpl template** — Using raw python-docx instead of Jinja2 Word template (docxtpl installed but template file not created)
10. **Prompt caching** — Researched but not yet implemented in `ai_service.py`
11. **Structured outputs** — Researched `messages.parse()` but current implementation uses streaming text + regex parsing

### Known Issues:
1. **WeasyPrint on macOS** — Conda's `DYLD_LIBRARY_PATH` interferes with finding `libgobject-2.0`. Works in Docker. On local Mac, need `brew install pango gdk-pixbuf gobject-introspection` and may need to deactivate conda.
2. **API tests need PostgreSQL** — SQLite doesn't support JSONB or PostgreSQL UUID. API tests (`test_api/`) won't run without a real PostgreSQL. Consider using testcontainers-python or a Docker-based test setup.
3. **Proposal number generation** — Currently uses SELECT max() which has a race condition under concurrency. PLAN.md specified counter table approach — implement that.
4. **Shadcn `asChild` removed** — Newer Shadcn/UI doesn't use the `asChild` prop (Radix moved away from it). We fixed `DialogTrigger` references but watch for this in any new components.
