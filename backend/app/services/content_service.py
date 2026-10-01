"""
services/content_service.py — read pack files, compute checksums, build manifest.

Content packs live at settings.content_packs_dir (default: ../content/packs).
Each file is a *.json file whose top-level object has pack_id and version fields.
"""
from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path

from ..config import settings
from ..schemas.content import ManifestResponse, PackMeta

log = logging.getLogger(__name__)


def _packs_dir() -> Path:
    """Resolve packs directory relative to this file's location."""
    base = Path(__file__).parent.parent.parent  # backend/
    configured = Path(settings.content_packs_dir)
    if configured.is_absolute():
        return configured
    return (base / configured).resolve()


def get_manifest() -> ManifestResponse:
    """
    Scan the packs directory and return metadata for every *.json pack file.
    Missing or unreadable directory returns an empty manifest (graceful degradation).
    """
    packs_dir = _packs_dir()
    if not packs_dir.is_dir():
        log.warning("[Content] Packs directory not found: %s", packs_dir)
        return ManifestResponse(packs=[])

    entries: list[PackMeta] = []
    for path in sorted(packs_dir.glob("*.json")):
        try:
            raw = path.read_bytes()
            data = json.loads(raw)
            sha = hashlib.sha256(raw).hexdigest()
            entries.append(
                PackMeta(
                    pack_id=data.get("pack_id", path.stem),
                    version=data.get("version", "0.0.0"),
                    size_bytes=len(raw),
                    sha256=sha,
                )
            )
        except Exception as exc:
            log.warning("[Content] Skipping %s: %s", path.name, exc)

    return ManifestResponse(packs=entries)


def get_pack_json(pack_id: str) -> bytes | None:
    """
    Return raw JSON bytes for the given pack_id, or None if not found.
    pack_id is matched against the filename stem (e.g. 'class7-science-v1').
    """
    packs_dir = _packs_dir()
    # Try exact stem match first
    candidate = packs_dir / f"{pack_id}.json"
    if candidate.is_file():
        return candidate.read_bytes()

    # Fallback: scan for pack_id field match
    for path in packs_dir.glob("*.json"):
        try:
            data = json.loads(path.read_bytes())
            if data.get("pack_id") == pack_id:
                return path.read_bytes()
        except Exception:
            continue

    return None
