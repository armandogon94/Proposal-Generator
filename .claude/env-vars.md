# Environment Variables

See `.env.example` for full list. Key variables:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://armando:PASSWORD@localhost:5432/proposals_db

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Runtime
ENVIRONMENT=development|production

# Cache
REDIS_URL=redis://localhost:6379/10

# CORS (development)
CORS_ORIGINS=http://localhost:3120,http://localhost:3000

# Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3120
```

Production: Use `.env` for secrets, never commit `.env` file.
