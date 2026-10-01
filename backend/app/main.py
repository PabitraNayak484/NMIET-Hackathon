"""
main.py — SATHI FastAPI application entry point.

Architecture note: the backend is *optional at runtime*.
The frontend agent works 100% offline; the backend only enhances:
  - LLM rephrasing (POST /api/llm/rephrase)
  - Cloud sync (POST /api/sync)
  - Content distribution (GET /api/content/*)
  - Teacher escalation (POST/GET/PATCH /api/escalations/*)
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .config import settings
from .db import Base, engine
from .routers import content, escalations, health, llm, sync
from .security import limiter

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO if settings.environment != "development" else logging.DEBUG,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — create DB tables on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("[SATHI] Creating database tables (if not exist)…")
    Base.metadata.create_all(bind=engine)
    log.info("[SATHI] Backend ready. ENV=%s", settings.environment)
    yield
    log.info("[SATHI] Shutting down.")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SATHI API",
    description=(
        "Smart AI Teaching and Helpful Intelligence — backend for sync, "
        "LLM rephrasing, content distribution, and teacher escalation."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ---- Rate limiting --------------------------------------------------------
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ---- CORS -----------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)


# ---- Security headers middleware ------------------------------------------
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    if settings.environment != "development":
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ---- Body size guard (64 KB on /api/sync) --------------------------------
@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    if request.url.path == "/api/sync":
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 65_536:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body exceeds 64 KB limit"},
            )
    return await call_next(request)


# ---- Routers --------------------------------------------------------------
app.include_router(health.router)
app.include_router(sync.router)
app.include_router(llm.router)
app.include_router(content.router)
app.include_router(escalations.router)


# ---- Root redirect to docs ------------------------------------------------
@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse({"message": "SATHI API — visit /docs for OpenAPI docs"})
