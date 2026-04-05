import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import clients, dashboard, pricing, proposals, templates
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.exports_dir, exist_ok=True)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for exports
app.mount("/static", StaticFiles(directory="assets"), name="static")

# API routes
app.include_router(clients.router, prefix=settings.api_prefix)
app.include_router(proposals.router, prefix=settings.api_prefix)
app.include_router(templates.router, prefix=settings.api_prefix)
app.include_router(pricing.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.app_name}
