# ProposalAI — AI-Powered Proposal Generator for Consultants

Generate polished, branded client proposals in minutes instead of hours. Built for freelancers and consulting agencies who want to close deals faster.

**Live at:** [proposals.305-ai.com](https://proposals.305-ai.com)

---

## What It Does

ProposalAI turns a simple form into a professional, branded proposal — complete with executive summary, scope, deliverables, timeline, pricing, and terms. An AI-powered chat lets you refine any section conversationally ("make the timeline more aggressive", "add a maintenance phase"), and export to PDF or DOCX with full corporate branding.

### Key Features

- **AI Draft Generation** — Fill out a form with client info, project type, and scope. Claude generates a structured proposal draft with all standard sections in seconds.
- **Chat-Based Refinement** — Conversational editing interface. Ask the AI to modify specific sections while preserving the rest of the document.
- **Professional Export** — Branded PDF (WeasyPrint) and DOCX (python-docx) with cover page, headers/footers, page numbers, pricing tables, and embedded diagrams.
- **Auto-Generated Diagrams** — Mermaid-powered architecture diagrams and Gantt timelines generated from your project description.
- **Mini CRM** — Track clients, companies, and proposal history. Status lifecycle: draft → sent → viewed → accepted → rejected → expired.
- **Proposal Templates** — Save successful proposals as reusable templates for web dev, AI/ML consulting, or custom project types.
- **Flexible Pricing** — Packages, hourly rates, custom line items, optional add-ons, and discount calculations.
- **View Tracking** — Unique proposal links with view tracking. Know when a client opens your proposal.

---

## Screenshots

> _Coming soon — the app is under active development._

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11+, FastAPI (async), SQLAlchemy 2.0 (async), PostgreSQL 16 |
| **Frontend** | Next.js 14+ (App Router), TypeScript, TailwindCSS, Shadcn/UI |
| **AI** | Claude API (Haiku for drafts, Sonnet for complex proposals) |
| **PDF Export** | WeasyPrint (HTML/CSS → PDF with paged media CSS) |
| **DOCX Export** | python-docx / docxtpl (Jinja2-in-Word templates) |
| **Diagrams** | Mermaid CLI for server-side SVG rendering |
| **Infra** | Docker Compose, Traefik (HTTPS), GitHub Actions CI/CD |
| **Testing** | pytest + pytest-asyncio (backend), vitest + RTL (frontend) |

---

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Next.js UI │────▶│  FastAPI Backend │────▶│ PostgreSQL   │
│  (Port 3120)│◀────│  (Port 8120)     │◀────│              │
└─────────────┘     └────────┬────────┘     └──────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              ┌─────▼─────┐   ┌──────▼──────┐
              │ Claude API │   │  WeasyPrint  │
              │ (Haiku/    │   │  / python-   │
              │  Sonnet)   │   │  docx        │
              └───────────┘   └─────────────┘
```

**Proposal Generation Flow:**

1. User fills out proposal wizard (client, project type, scope, pricing)
2. Backend sends structured prompt to Claude API
3. AI generates proposal sections (streamed via SSE to frontend)
4. Sections stored in PostgreSQL, displayed in editor
5. User refines sections via chat interface (AI edits specific sections)
6. Mermaid diagrams auto-generated for architecture and timeline
7. Export to branded PDF or DOCX on demand

---

## Getting Started

### Prerequisites

- Python 3.11+ with [uv](https://docs.astral.sh/uv/)
- Node.js 18+ with npm
- PostgreSQL 16
- An [Anthropic API key](https://console.anthropic.com/)

### Local Development

```bash
# Clone the repo
git clone https://github.com/305-ai/proposal-generator.git
cd proposal-generator

# Backend setup
cd backend
cp .env.example .env          # Add your ANTHROPIC_API_KEY and DB credentials
uv sync                       # Install Python dependencies
uv run alembic upgrade head   # Run database migrations
uv run uvicorn app.main:app --reload --port 8120

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev -- -p 3120
```

Open [http://localhost:3120](http://localhost:3120).

### Docker Compose (Full Stack)

```bash
cp .env.example .env  # Configure your environment variables
docker compose up -d
```

This starts PostgreSQL, the FastAPI backend (port 8120), and the Next.js frontend (port 3120).

---

## Project Structure

```
proposal-generator/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Environment-based settings
│   │   ├── api/                 # Route handlers
│   │   │   ├── clients.py       # Client CRUD
│   │   │   ├── proposals.py     # Proposal CRUD + AI generation
│   │   │   ├── templates.py     # Template management
│   │   │   ├── pricing.py       # Pricing packages
│   │   │   └── dashboard.py     # Stats and overview
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Business logic
│   │   │   ├── ai_service.py    # Claude API integration
│   │   │   ├── pdf_service.py   # WeasyPrint PDF generation
│   │   │   ├── docx_service.py  # DOCX generation
│   │   │   └── mermaid_service.py
│   │   └── database/            # DB session + Alembic migrations
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── app/                     # Next.js App Router pages
│   │   ├── page.tsx             # Dashboard
│   │   ├── proposals/
│   │   │   ├── new/page.tsx     # Multi-step proposal wizard
│   │   │   └── [id]/page.tsx    # Proposal editor + chat refinement
│   │   ├── clients/             # Client management
│   │   ├── templates/           # Template manager
│   │   └── settings/            # App settings
│   ├── components/              # React components
│   └── lib/                     # API client, hooks, utilities
├── docker-compose.yml
└── .env.example
```

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/proposals` | Create new proposal |
| `POST` | `/api/proposals/{id}/generate-draft` | AI-generate proposal draft (SSE stream) |
| `POST` | `/api/proposals/{id}/refine` | Chat-based section refinement (SSE stream) |
| `POST` | `/api/proposals/{id}/export-pdf` | Generate branded PDF |
| `POST` | `/api/proposals/{id}/export-docx` | Generate branded DOCX |
| `GET` | `/api/proposals` | List proposals (filter by status, client, date) |
| `GET/POST` | `/api/clients` | Client CRUD |
| `GET/POST` | `/api/templates` | Proposal template management |
| `GET` | `/api/dashboard/stats` | Pipeline overview and metrics |

Full API documentation available at `/docs` (Swagger UI) when running the backend.

---

## Testing

```bash
# Backend tests
cd backend
uv run pytest                          # All tests
uv run pytest tests/test_services/     # Service layer only
uv run pytest --cov=app                # With coverage report

# Frontend tests
cd frontend
npm run test                           # vitest
npm run test -- --coverage             # With coverage
```

**Test coverage targets:**
- AI service: prompt construction, structured output parsing, streaming
- PDF/DOCX export: file creation, structure validation, branding elements
- Pricing calculator: known inputs → expected outputs, discounts, edge cases
- Client CRUD: create, update, soft delete, proposal associations
- Frontend: proposal wizard flow, chat refinement UX, client list, template manager

---

## Deployment

The app deploys to a VPS via Docker Compose behind Traefik for automatic HTTPS.

```bash
# On VPS
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

**Infrastructure:**
- **Reverse Proxy:** Traefik v3 with Let's Encrypt SSL
- **Domain:** proposals.305-ai.com
- **CI/CD:** GitHub Actions (lint → test → build → deploy)
- **Database:** PostgreSQL 16 (shared instance)
- **Backups:** Daily PostgreSQL dumps

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://user:pass@localhost:5432/proposals_db` |
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-...` |
| `ENVIRONMENT` | Runtime environment | `development` or `production` |
| `REDIS_URL` | Redis connection (caching) | `redis://localhost:6379/10` |

See `.env.example` for the complete list.

---

## Roadmap

- [x] Project planning and architecture
- [ ] Backend API (clients, proposals, AI generation)
- [ ] PDF and DOCX export with branding
- [ ] Frontend (dashboard, wizard, editor, chat refinement)
- [ ] Mermaid diagram generation
- [ ] View tracking and status notifications
- [ ] Template management
- [ ] Docker deployment with Traefik
- [ ] Email integration (send proposals, track opens)
- [ ] Digital signature integration
- [ ] Analytics dashboard (conversion rates, win/loss)

---

## Built With

This project is part of the [305-ai.com](https://305-ai.com) consulting portfolio — demonstrating AI-powered business automation for real-world workflows.

---

## License

Private project. All rights reserved.
