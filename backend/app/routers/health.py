"""
routers/health.py — GET /api/health
Returns service status, current UTC time, and latest content pack version.
Used by the frontend network monitor to ping every 10 s (timeout 2 s).
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from ..services.content_service import get_manifest

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", summary="Service health check")
async def health() -> dict:
    manifest = get_manifest()
    latest_version = manifest.packs[0].version if manifest.packs else "none"
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
        "pack_version": latest_version,
    }
