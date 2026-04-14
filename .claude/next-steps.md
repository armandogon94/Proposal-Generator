# Next Steps — Proposal Generator

> Prioritized list of what to do next when resuming work.
> Last updated: 2026-04-02

---

## Priority 1: Get It Running Locally

### 1.1 Start Docker Compose and run migrations
```bash
cp .env.example .env
# Edit .env: add ANTHROPIC_API_KEY, set DB_PASSWORD
make up
make migrate   # Will need: cd backend && uv run alembic revision --autogenerate -m "initial" && uv run alembic upgrade head
```
**Note:** Alembic has no migration files yet. Need to autogenerate the initial migration.

### 1.2 Install WeasyPrint system dependencies (macOS)
```bash
brew install pango gdk-pixbuf gobject-introspection libffi
```
If using conda, may need to deactivate it first or set `DYLD_LIBRARY_PATH=/opt/homebrew/lib`.

### 1.3 Create placeholder branding assets
```bash
# Need these files for PDF/DOCX export:
backend/assets/images/logo.png     # 305 AI logo, ~600px wide
backend/assets/images/logo.svg     # SVG version for WeasyPrint
backend/assets/fonts/Inter-Regular.ttf
backend/assets/fonts/Inter-Bold.ttf
```

### 1.4 Smoke test the full flow
1. Open http://localhost:3120 (dashboard)
2. Create a client
3. Create a proposal with pricing items
4. Generate AI draft
5. Refine a section via chat
6. Export PDF and DOCX
7. Test public view link

---

## Priority 2: Fix Known Issues

### 2.1 Proposal number generation race condition
Current implementation uses `SELECT max()` which has a race condition.
**Fix:** Implement the counter table approach from research:
```sql
CREATE TABLE proposal_counters (year INT PRIMARY KEY, last_number INT NOT NULL DEFAULT 0);
```
Use `INSERT...ON CONFLICT DO UPDATE SET last_number = last_number + 1 RETURNING last_number`.

### 2.2 Upgrade AI service to use structured outputs
Current `ai_service.py` uses streaming text + regex parsing.
**Upgrade to:** `client.messages.parse(output_format=ProposalDraft)` for guaranteed schema compliance.
Keep streaming for UI feedback but parse structured output on completion.

### 2.3 Add prompt caching to refinement
Add `cache_control={"type": "ephemeral"}` to the system prompt in `refine_section()`.
This saves ~90% on input costs for multi-turn refinement sessions.

### 2.4 Create docxtpl template
Current DOCX service uses raw python-docx. Upgrade to docxtpl approach:
1. Create `backend/assets/templates/proposal.docx` in Microsoft Word with styles, headers, logos
2. Add Jinja2 placeholders: `{{ client_name }}`, `{% for section in sections %}`, etc.
3. Rewrite `docx_service.py` to use `DocxTemplate` from docxtpl

---

## Priority 3: Testing & Quality

### 3.1 API integration tests
Need PostgreSQL to run. Options:
- Use Docker test PostgreSQL: `docker compose exec postgres psql -U armando -d proposals_db`
- Use testcontainers-python for ephemeral test databases
- Write a `tests/conftest_integration.py` that connects to Docker PostgreSQL

### 3.2 Frontend tests (vitest)
- Install: `cd frontend && npm install -D vitest @testing-library/react @testing-library/user-event jsdom msw`
- Add `vitest.config.ts`
- Write tests for: ProposalWizard flow, ChatRefinement interaction, ClientList search, TemplateManager CRUD

### 3.3 Seed data script
Create `backend/app/seed.py` with sample clients, templates, and pricing packages for development.

---

## Priority 4: Deployment

### 4.1 GitHub Actions CI/CD
Create `.github/workflows/ci.yml`:
- Lint (ruff + eslint)
- Test (pytest + vitest)
- Build (Docker images)
- Deploy (SSH to VPS, docker compose pull, up)

### 4.2 Traefik production config
Create `traefik.yml` and `docker-compose.prod.yml` with:
- HTTPS via Let's Encrypt
- Subdomain routing: `proposals.305-ai.com`
- Rate limiting
- Security headers

### 4.3 Production Dockerfiles
- Multi-stage backend Dockerfile (build → production)
- Frontend: `npm run build` → serve with Next.js standalone

---

## Priority 5: Feature Enhancements

1. **Email integration** — Send proposals via email with tracking pixel + unique link
2. **Notification worker** — Background job processing the notification_queue table
3. **Proposal versioning** — Track section changes, allow rollback
4. **Advanced pricing** — Package builder UI, saved pricing packages
5. **Analytics dashboard** — Conversion rates, average negotiation time
6. **Digital signatures** — DocuSign/HelloSign integration
