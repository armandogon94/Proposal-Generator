# Project Memory — Proposal Generator

> Persistent notes: decisions, research findings, patterns, gotchas, preferences.
> Updated at the end of each significant work session.

---

## Research Findings

### AI Proposal Generation

**Claude Model Selection (current pricing as of 2026-04):**
- Haiku 4.5: $1/MTok input, $5/MTok output — 200k context, 64k max output. Best for drafts.
- Sonnet 4.6: $3/MTok input, $15/MTok output — 1M context, 64k max output. Best for complex/high-value proposals.
- Opus 4.6: $5/MTok input, $25/MTok output — 1M context, 128k max output. Overkill for proposals.
- A ~2500 word proposal is roughly 3,500 tokens output. At Haiku: ~$0.02/proposal. At Sonnet: ~$0.06.
- With prompt caching (5-min TTL), input costs drop ~90% after first request in a session.

**Structured Output Strategy (UPDATED — use `messages.parse()` not `tool_use`):**
- Use `client.messages.parse(output_format=ProposalDraft)` with a Pydantic model.
- This uses **Structured Outputs** (constrained decoding) — guaranteed schema-compliant JSON.
- GA for Haiku 4.5, Sonnet 4.6, Opus 4.6. ~100-300ms overhead on first schema (cached 24h after).
- Define a `ProposalDraft` Pydantic model with `Field(description=...)` — descriptions become implicit instructions.
- No manual JSON parsing needed — returns typed `response.parsed_output` attribute.
- For streaming + structured: stream for UI, accumulate JSON, parse with Pydantic on completion.

**Streaming with Python SDK:**
```python
# Use AsyncAnthropic for FastAPI
ai_client = AsyncAnthropic()
async with ai_client.messages.stream(...) as stream:
    async for text in stream.text_stream:
        yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"
    final = await stream.get_final_message()  # usage stats
```
- `stream.text_stream` yields text deltas as they arrive.
- `stream.get_final_message()` returns accumulated Message with usage stats.
- `stream.get_final_text()` returns the complete accumulated text.
- Wrap in `StreamingResponse(generator, media_type="text/event-stream")` for FastAPI SSE.

**Prompt Caching for Multi-Turn Refinement:**
- Use `cache_control={"type": "ephemeral"}` — auto-caches system prompt + conversation history for 5 min.
- Cache reads cost 0.1x normal input price. For 5-10 refinement turns, saves ~80-90% on input costs.

**Chat Refinement Pattern:**
- Pass ONLY the relevant section + brief context summary of other sections (first 200 chars each).
- System prompt: "Return ONLY the refined section content — no preamble, no explanation, no section headers."
- Rules: preserve specific numbers/dates unless explicitly asked to change; maintain same length unless asked.
- If change could create inconsistency, append `[NOTE: ...]` at end of response.
- **Section dependency map** for coherence:
  - timeline changes → may affect pricing_items, deliverables
  - project_scope changes → may affect deliverables, timeline, executive_summary
  - deliverables changes → may affect timeline, pricing_items
  - pricing_items changes → may affect executive_summary (total amount mentioned)
- UI shows: "This change may affect Timeline and Pricing. [Update automatically] [Review manually]"
- Use Sonnet 4.6 for refinements (nuanced editing benefits from stronger reasoning).

**Mermaid Diagram Generation:**
- Prompt must include STRICT syntax rules: always quote labels, no reserved words as IDs, ASCII only.
- Common LLM errors: smart quotes, em dashes, unquoted special chars, "end" as node ID, single-% comments.
- **Automated fix function:** regex-based `validate_and_fix_mermaid()` catches ~90% of common errors.
- On validation failure, retry with error message fed back to Claude (max 2 retries).
- **Rendering — Primary: Self-hosted Kroki** (`yuzutech/kroki` + `yuzutech/kroki-mermaid` containers).
  - Keeps backend lightweight (no Chromium). Add to docker-compose.yml on port 8125.
  - REST API: `POST http://kroki:8000/mermaid/svg` with Mermaid code as body.
- **Rendering — Fallback: Python `mmdc` package** (`pip install mmdc`). Pure Python, no Node.js.
  - Uses PhantomJS (legacy), may not support newest Mermaid features.
- **Avoid:** Node.js mermaid-cli in backend Docker (adds ~400MB Chromium dependency).
- Cache rendered SVG in `proposal_diagrams.svg_output` column.

### Document Export (PDF/DOCX)

**WeasyPrint (confirmed best choice for PDF):**
- Excellent `@page` CSS support: margin boxes, running headers/footers, page counters, named pages.
- Supports `@font-face` with TTF/WOFF2 — fonts embedded in PDF automatically.
- Performance: ~2-4s first PDF, ~1-2s subsequent (font caching). Adequate for our use case.
- **NO Flexbox/Grid support** — use floats, tables, `display: inline-block` for layout.
- **NO CSS custom properties** (`var(--color)`) — use Jinja2 templating to inject values.
- **NO JavaScript** — all content must be pre-rendered in HTML.
- Generates PDF bookmarks from headings: `h1 { bookmark-level: 1; }`.
- macOS install: `brew install pango gdk-pixbuf libffi` then `pip install weasyprint`.
- Docker: Debian-slim base + `libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libcairo2`. Avoid Alpine (musl issues).

**python-docx / docxtpl (for DOCX):**
- **Use docxtpl** (Jinja2-in-Word) over raw python-docx — cleaner separation of design and data.
- Create branded .docx template in Word with styles, headers, logos, then fill programmatically.
- python-docx does NOT support SVG — must convert Mermaid SVGs to PNG via CairoSVG or mmdc `-o .png`.
- Font names embedded but not font files — recipient needs font installed or Word substitutes.
- Page numbers require low-level XML field codes (wrap in utility function).
- TOC requires field codes too — Word prompts user to "Update fields" on open.

**Branding Asset Architecture:**
```
backend/assets/
├── fonts/         # Inter TTF/WOFF2 files
├── images/        # logo.svg (PDF), logo.png (DOCX), logo-white variants
└── templates/
    ├── proposal.html   # Jinja2 for WeasyPrint
    ├── proposal.css    # Styles for WeasyPrint
    └── proposal.docx   # Word template for docxtpl
```
- Shared `brand.py` constants module consumed by both PDF and DOCX generators.
- SVG for WeasyPrint, PNG for python-docx. Convert with CairoSVG: `cairosvg.svg2png()`.

### Mini CRM Patterns

**Status State Machine:**
- Use PostgreSQL ENUM type for `proposal_status`: draft, sent, viewed, accepted, rejected, expired, superseded.
- Enforce valid transitions via BEFORE UPDATE trigger calling `is_valid_status_transition()`.
- Auto-populate timestamp columns (`sent_at`, `first_viewed_at`, `accepted_at`) in the trigger.
- Terminal states: accepted, rejected, expired, superseded (no transitions out).

**Audit Trail:**
- `proposal_status_history` table populated by AFTER UPDATE trigger.
- Use `SET LOCAL` / `current_setting()` pattern to pass app context (user ID, IP) into triggers.

**Proposal View Tracking:**
- **Primary: Unique link approach** — `view_token` (256-bit, `encode(gen_random_bytes(32), 'hex')`) on each proposal.
- Public URL: `/p/{token}` → logs view, transitions `sent` → `viewed`, renders proposal.
- Optional: tracking pixel as supplementary signal (unreliable: 40-70% detection rate due to email privacy features).
- `proposal_views` table: proposal_id, viewed_at, ip_address, user_agent.

**Proposal Numbering:**
- **Counter table approach** (not sequences) for gap-free, year-resetting numbers.
- `proposal_counters` table with `INSERT...ON CONFLICT DO UPDATE` for atomic increment.
- Format: `PROP-{YEAR}-{SEQ:04d}` (e.g., PROP-2026-0001).
- Applied via BEFORE INSERT trigger on proposals table.

**Pricing Model:**
- Line items with `item_type` ENUM: package, hourly, fixed, addon, discount.
- `amount` as `GENERATED ALWAYS AS (quantity * unit_price) STORED` — guaranteed consistency.
- `is_optional` / `is_selected` for optional add-ons.
- Discounts modeled as negative line items (type='discount').
- Use `NUMERIC(12,2)` for all money. Never FLOAT. Avoid PostgreSQL `money` type (locale-dependent).
- `proposal_totals` view with FILTER clauses for subtotal, discount_total, grand_total.

**Soft Delete:**
- Soft delete (`deleted_at` column) for contacts/companies with associated proposals.
- Partial indexes on `deleted_at IS NULL` for performance.
- Active record views: `CREATE VIEW active_contacts AS SELECT * FROM contacts WHERE deleted_at IS NULL`.

**Notification Queue:**
- Outbox pattern: `notification_queue` table populated by trigger, processed by background worker.
- Decouples email sending from transaction (no blocking on SMTP calls).

---

## Architectural Decisions

| Date | Role | Decision | Reasoning |
|------|------|----------|-----------|
| 2026-04-01 | Architect | Single-user, no auth | Armando is sole user; simplifies everything |
| 2026-04-01 | Architect | WeasyPrint for PDF | Pure Python, no headless browser, excellent @page CSS support, good Docker footprint |
| 2026-04-01 | Architect | docxtpl over raw python-docx | Jinja2-in-Word separates design from data; designer can edit template in Word |
| 2026-04-01 | DBA | UUID PKs + JSONB for flex fields | Distributed-friendly, non-enumerable for public links, schema flexibility |
| 2026-04-01 | Architect | SSE for streaming | Native browser support, simpler than WebSockets for one-way AI streaming |
| 2026-04-01 | DBA | Counter table for proposal numbers | Gap-free, year-resetting, atomic via INSERT...ON CONFLICT, no DDL needed |
| 2026-04-01 | DBA | PostgreSQL ENUM for status | Type safety prevents typos, self-documenting, worth migration cost for stable lifecycle |
| 2026-04-01 | DBA | BEFORE UPDATE trigger for state machine | Enforces valid transitions regardless of how UPDATE is issued (app, admin, migration) |
| 2026-04-01 | DBA | Generated column for line item amounts | `GENERATED ALWAYS AS (qty * unit_price) STORED` — impossible for app bugs to cause inconsistency |
| 2026-04-01 | Architect | Unique link for view tracking | 100% reliable (vs 40-70% for tracking pixel), privacy-respecting, enables web-rendered proposals |
| 2026-04-01 | Architect | Notification outbox pattern | Decouples email from DB transaction, resilient to SMTP failures |
| 2026-04-01 | Architect | `messages.parse()` structured outputs | Constrained decoding guarantees schema compliance; Pydantic model → typed `parsed_output` |
| 2026-04-01 | Architect | Self-hosted Kroki for Mermaid rendering | Keeps backend container lightweight (no Chromium); Python mmdc package as fallback |
| 2026-04-01 | Architect | Prompt caching for refinement sessions | `cache_control={"type": "ephemeral"}` — 5-min TTL, 90% input cost reduction on multi-turn |
| 2026-04-01 | Architect | Sonnet for refinements, Haiku for drafts | Refinement needs nuanced reasoning; drafts are structured and template-driven |
| 2026-04-01 | Architect | Section dependency map for coherence | Explicit graph of which sections affect which; user confirms cascading updates |

---

## Preferences & Patterns Learned

- **User (Armando):** Prefers "implement all phases step by step until it is up and running" — wants full implementation, not incremental small PRs. Comfortable with large output.
- **Effort level:** Set to max at the start of implementation. Expects comprehensive, production-quality code.
- **Local memory:** Explicitly wants ALL context stored in `.claude/` inside the project directory (NOT global `~/.claude/`). This ensures portability — if the folder is copied to another machine, all context comes with it.
- **uv, not pip:** Backend uses `uv` for Python package management. Use `[dependency-groups]` not `[project.optional-dependencies]` for dev deps.
- **Next.js App Router:** Frontend uses App Router (app/ directory), not Pages Router. All pages are "use client" for now.
- **Shadcn/UI:** Newer versions removed `asChild` prop from components like `DialogTrigger`. Don't use it.
- **Test strategy:** Service tests run without DB (pure unit tests). API integration tests need PostgreSQL (can't use SQLite due to JSONB/UUID).
- **Lazy imports for heavy deps:** WeasyPrint and python-docx imports should be lazy (inside endpoint functions) so tests can run without system libraries installed.

---

## Gotchas & Warnings

- **WeasyPrint:** No Flexbox/Grid — use tables/floats. No CSS vars — use Jinja2 templating. No JS.
- **python-docx:** No SVG support — must convert to PNG first. Font names only, not embedded font files.
- **Mermaid CLI (mmdc):** Heavy Docker dependency (~400MB, needs Puppeteer). Consider mermaid.ink API as alternative.
- **PostgreSQL `money` type:** Avoid — locale-dependent, poor ORM compatibility. Use NUMERIC(12,2).
- **Apple Mail Privacy Protection:** Pre-fetches tracking pixels, generating false "viewed" events. Don't rely solely on pixel tracking.
- **Docker WeasyPrint:** Use Debian-slim, NOT Alpine (musl libc issues with Pango).
- **Haiku 3 deprecated:** Will be retired April 19, 2026. Use Haiku 4.5 (claude-haiku-4-5).
- **Structured outputs + streaming:** JSON arrives incrementally and can't be parsed mid-stream. Stream for UI, parse completed text with Pydantic on `stream.get_final_text()`.
- **Structured output schema overhead:** ~100-300ms on first request with new schema (cached 24h after). Negligible for proposal generation.
- **Mermaid "end" reserved word:** Claude frequently uses "end" as a node ID. Must rename to "endNode" or "finish" in validation.
- **Mermaid smart quotes:** Claude often outputs curly quotes (" ") instead of ASCII ("). Regex replace in validation.
- **Python `mmdc` package:** Uses PhantomJS (legacy/unmaintained). Rendering fidelity may differ from browser. Good fallback, not primary.
- **Kroki self-hosted:** Needs 2 containers (`yuzutech/kroki` + `yuzutech/kroki-mermaid`). Add to docker-compose.yml.
- **WeasyPrint + conda on macOS:** Conda's DYLD_LIBRARY_PATH prevents WeasyPrint from finding `libgobject-2.0`. Deactivate conda or set `DYLD_LIBRARY_PATH=/opt/homebrew/lib`. Works fine in Docker.
- **uv dependency groups:** Use `[dependency-groups]` NOT `[project.optional-dependencies]` — the latter doesn't work with `uv sync --group dev`.
- **Pydantic email validation:** Must use `pydantic[email]` in dependencies if using `EmailStr` in schemas.
- **Shadcn asChild removed:** Newer Shadcn/UI versions don't support `asChild` prop. Use `<DialogTrigger>` directly instead of `<DialogTrigger asChild>`.
- **Alembic initial migration:** No migration files exist yet. First run needs `alembic revision --autogenerate -m "initial"`.
- **Proposal numbering race condition:** Current SELECT max() approach has a race under concurrency. Need to implement counter table approach from research.
