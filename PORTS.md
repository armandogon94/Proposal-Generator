# Port Allocation — Project 12: Proposal Generator

> All host-exposed ports are globally unique across all 16 projects so every project can run simultaneously. See `../PORT-MAP.md` for the full map.

## Current Assignments

| Service | Host Port | Container Port | File |
|---------|-----------|---------------|------|
| Frontend (Next.js) | **3120** | 3000 | docker-compose.yml |
| Backend (FastAPI) | **8120** | 8000 | docker-compose.yml |
| Kroki (diagram renderer) | **8125** | 8000 | docker-compose.yml |
| PostgreSQL | **5437** | 5432 | docker-compose.yml |
| Redis | **6382** | 6379 | docker-compose.yml |

## Allowed Range for New Services

If you need to add a new service to this project, pick from these ranges **only**:

| Type | Allowed Host Ports |
|------|--------------------|
| Frontend / UI | `3120 – 3129` |
| Backend / API | `8120 – 8129` |
| PostgreSQL | `5437` (already assigned — do not spin up a second instance) |
| Redis | `6382` (already assigned — do not spin up a second instance) |

Available slots: `3121-3129`, `8121-8124`, `8126-8129`.

## Do Not Use

Every port outside the ranges above is reserved by another project. Always check `../PORT-MAP.md` before picking a port.

Key ranges already taken:
- `3110-3119 / 8110-8119` → Project 11
- `3130-3139 / 8130-8139` → Project 13 (conventional range; see note)
- `13000-13110` → Project 13 CRM (actual port scheme)
- `5432-5436` → Projects 02-05, 11 PostgreSQL
- `5438-5439` → Projects 13, 15 PostgreSQL
- `6379-6381` → Projects 02, 05, 10 Redis
- `6383-6385` → Projects 13, 15, 16 Redis
