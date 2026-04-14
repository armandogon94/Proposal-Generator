# Key Architectural Decisions

| Decision | Reasoning | Trade-offs |
|----------|-----------|-----------|
| **Single-user app** (no auth) | Only Armando uses it; simplifies everything | Can scale to multi-user with auth module later |
| **Haiku for drafts, Sonnet for refinements** | Haiku fast/cheap (~$0.02/draft), Sonnet better reasoning (~$0.06) | Adds complexity of model selection in UI |
| **WeasyPrint over Puppeteer** | Pure Python, no Chromium, excellent @page CSS, 2-4s generation | No Flexbox/Grid, no CSS vars, no JS in templates |
| **SSE (Server-Sent Events) for streaming** | Native browser support, simpler than WebSockets for one-way streams | HTTP-only, single connection (fine for one user) |
| **JSONB for flexible fields** | Schema flexibility (deliverables, timeline, package includes) | Requires Postgres (not SQLite), harder to query deeply |
| **Counter table for proposal numbers** | Atomic increment, gap-free, year-resetting (PROP-2026-0001) | Extra table + logic vs sequence (but sequences reset yearly is complex) |
| **PostgreSQL ENUM for status** | Type safety, self-documenting, prevents typos | Requires migration to add new statuses |
| **Unique token for view tracking** | 100% reliable (vs 40-70% for tracking pixel), privacy-respecting | Need secure token generation |
| **messages.parse() for structured outputs** | Guaranteed schema compliance, typed `parsed_output` | ~100-300ms overhead, JSON comes incremental (can't stream-parse) |
| **Self-hosted Kroki for Mermaid** | No Chromium in backend, lightweight, reliable | Extra container, fallback to mmdc if Kroki down |
| **Prompt caching (ephemeral TTL)** | 90% input cost reduction on multi-turn refinement | Need to structure conversation with caching hints |
