"""
routers/content.py — content pack distribution endpoints.
  GET /api/content/manifest  → list of packs with version + sha256
  GET /api/content/packs/{pack_id}  → raw JSON pack download
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from ..schemas.content import ManifestResponse
from ..services.content_service import get_manifest, get_pack_json

router = APIRouter(prefix="/api/content", tags=["content"])


@router.get(
    "/manifest",
    response_model=ManifestResponse,
    summary="List available content packs with version and checksum",
)
async def content_manifest() -> ManifestResponse:
    return get_manifest()


@router.get(
    "/packs/{pack_id}",
    summary="Download a content pack as raw JSON",
    response_class=Response,
)
async def get_pack(pack_id: str) -> Response:
    raw = get_pack_json(pack_id)
    if raw is None:
        raise HTTPException(status_code=404, detail=f"Pack '{pack_id}' not found")
    return Response(content=raw, media_type="application/json")
