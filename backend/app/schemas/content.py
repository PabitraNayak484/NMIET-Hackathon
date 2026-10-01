"""
schemas/content.py — Pydantic models for GET /api/content/manifest and pack download.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class PackMeta(BaseModel):
    """Metadata entry in the content manifest."""
    pack_id: str
    version: str
    size_bytes: int = Field(..., description="Raw file size in bytes")
    sha256: str = Field(..., description="Hex SHA-256 of the pack JSON file")


class ManifestResponse(BaseModel):
    """List of available content packs with checksums for delta-sync."""
    packs: list[PackMeta]
