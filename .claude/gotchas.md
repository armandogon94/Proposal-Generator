# Gotchas & Known Issues

## Critical Issues to Fix

1. **Proposal numbering race condition** (HIGH)
   - Current: `SELECT max(cast(split_part(proposal_number, '-', 3) as int)) + 1`
   - Problem: Race condition under concurrency
   - Fix: Implement counter table from memory.md (atomic via INSERT...ON CONFLICT)

2. **WeasyPrint on macOS with conda** (MEDIUM)
   - Problem: Conda's `DYLD_LIBRARY_PATH` breaks Pango (libgobject-2.0 not found)
   - Workaround: Deactivate conda or set `export DYLD_LIBRARY_PATH=/opt/homebrew/lib`
   - Works fine in Docker

3. **Structured outputs not yet implemented** (MEDIUM)
   - Current: Streaming text + regex parsing in `ai_service.py`
   - Upgrade to: `client.messages.parse(output_format=ProposalDraft)`
   - Benefit: Guaranteed schema compliance, typed response

4. **Mermaid common errors** (LOW)
   - Haiku generates smart quotes `"` instead of ASCII `"` — regex-fixed
   - Uses `end` as node ID (reserved in Mermaid) — must rename in validation
   - Unquoted labels with special chars — auto-quote in validator

## Testing Gaps

- **API integration tests** need running PostgreSQL (can't use SQLite with JSONB/UUID)
  - Workaround: Use Docker test container in CI, or testcontainers-python
- **Frontend vitest** not yet set up (config exists, no tests written)
- **E2E tests** not implemented (Playwright/Cypress)

## Deferred Work

From implementation-status.md:
- Alembic initial migration (need running PostgreSQL to autogenerate)
- Seed data script (`backend/app/seed.py`)
- GitHub Actions CI/CD workflows
- Traefik production config (`traefik.yml`)
- Frontend vitest setup + component tests
- Logo/branding assets (placeholders needed at `backend/assets/images/`)
- Email templates (`backend/app/templates/email_templates/`)
- Notification worker (outbox pattern designed but not implemented)
- docxtpl template upgrade (researched, not yet implemented)

## System Dependencies

### macOS (for local PDF generation)
```bash
brew install pango gdk-pixbuf gobject-introspection libffi
```

### Docker
Already included in Dockerfile.

### Node.js
v18+ with npm 9+

### Python
3.11+ with uv
