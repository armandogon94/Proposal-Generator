# Session History — Proposal Generator

> Chronological log of what was done in each Claude Code session.
> Read this to understand what happened and why, in order.

---

## Session 1: 2026-04-01/02 — Research + Full Implementation

### What happened:
1. **Read planning docs**: PLAN.md (full schema, prompts, endpoints, specs), AGENTS.md (7 specialist roles), PORT-MAP.md (ports: frontend 3120, backend 8120).

2. **Created project context files**:
   - `CLAUDE.md` — main project context (tech stack, conventions, commands, branding)
   - `.claude/memory.md` — persistent research findings and architectural decisions
   - `.claude/scratchpad.md` — session working notes

3. **Deep research via 3 parallel agents**:
   - **AI Proposal Generation**: Claude API structured outputs (`messages.parse()`), streaming with AsyncAnthropic, prompt caching, chat refinement with section dependency map, Mermaid diagram generation + validation
   - **Document Export**: WeasyPrint (best for PDF — @page CSS, margin boxes, no Flexbox/Grid), docxtpl for DOCX (Jinja2-in-Word), branding asset architecture
   - **Mini CRM Patterns**: PostgreSQL ENUM status machine with triggers, counter table for proposal numbering, unique link view tracking, pricing calculator with generated columns, notification outbox pattern

4. **Synthesized research** into `.claude/memory.md` — all findings, decisions, and gotchas.

5. **Created README.md** — Professional GitHub-facing README.

6. **Built entire backend** (37 Python files):
   - FastAPI app with 5 routers (29 endpoints total)
   - SQLAlchemy 2.0 async models (10 tables)
   - Pydantic schemas for all CRUD operations
   - AI service (streaming generation + chat refinement)
   - PDF service (WeasyPrint + Jinja2 template)
   - DOCX service (python-docx with corporate branding)
   - Mermaid service (Kroki + validation)
   - Pricing calculator service
   - Full HTML/CSS PDF template with cover page
   - Alembic migration setup

7. **Built entire frontend** (28 TypeScript files):
   - Next.js 14 App Router with 9 pages
   - Dashboard, proposals list, 4-step wizard, 3-column editor with chat
   - Client management, template manager, settings
   - Shadcn/UI (15 components), TailwindCSS, lucide-react icons
   - Full typed API client matching backend schemas

8. **Built infrastructure**:
   - Docker Compose (6 services: Postgres, Redis, backend, frontend, Kroki, Mermaid)
   - Dockerfiles for backend (Python 3.12-slim + WeasyPrint deps) and frontend (Node 20)
   - Makefile (14 targets), .env.example, .gitignore

9. **Wrote and verified tests**:
   - 11 passing tests (pricing calculator: 6, mermaid validation: 5)
   - API integration tests written but need PostgreSQL to run
   - Fixed: pyproject.toml dependency-groups (not optional-dependencies for uv), email-validator missing, WeasyPrint lazy imports for tests, Shadcn asChild deprecation

### Key corrections made during implementation:
- Changed `[project.optional-dependencies]` to `[dependency-groups]` for uv compatibility
- Added `pydantic[email]` (was missing email-validator)
- Made PDF/DOCX service imports lazy in proposals router (WeasyPrint fails without system libs)
- Changed `from app.services.proposal_service import ProposalService` to `import calculate_totals` (no class, just function)
- Removed `asChild` from Shadcn DialogTrigger (deprecated in newer versions)
- Moved API tests to need real PostgreSQL (SQLite doesn't support JSONB/UUID)

### Time breakdown:
- Research: ~20 min (3 parallel agents)
- Backend scaffold + models + schemas: ~15 min
- API routes + services: ~15 min
- Frontend scaffold + all pages: ~20 min (partially parallelized with agent)
- Infrastructure (Docker, Makefile, env): ~5 min
- Tests + debugging: ~15 min
- Total: ~90 min
