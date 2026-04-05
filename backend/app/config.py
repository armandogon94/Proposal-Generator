from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://armando:password@localhost:5432/proposals_db"

    # Redis
    redis_url: str = "redis://localhost:6379/10"

    # AI
    anthropic_api_key: str = ""
    default_ai_model: str = "claude-haiku-4-5"
    enhanced_ai_model: str = "claude-sonnet-4-6"

    # App
    environment: str = "development"
    app_name: str = "305 AI Proposal Generator"
    api_prefix: str = "/api"

    # Branding
    company_name: str = "305 AI"
    company_url: str = "305-ai.com"
    company_email: str = "hello@305-ai.com"
    primary_color: str = "#1E40AF"
    secondary_color: str = "#0369A1"
    accent_color: str = "#FB923C"

    # Export
    exports_dir: str = "exports"

    # Kroki (Mermaid rendering)
    kroki_url: str = "http://localhost:8125"

    # CORS
    cors_origins: list[str] = ["http://localhost:3120"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
