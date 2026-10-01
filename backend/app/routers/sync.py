"""
routers/sync.py — POST /api/sync
Receives batched progress events from the client (max 50, 64 KB body).
Idempotent: duplicate event_ids are silently acknowledged.
Events are ordered by (device_id, seq) — clock-skew safe (MR-50).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas.sync import SyncRequest, SyncResponse
from ..security import limiter
from ..services.sync_service import process_sync

router = APIRouter(prefix="/api", tags=["sync"])

_MAX_BODY = 65_536  # 64 KB


@router.post(
    "/sync",
    response_model=SyncResponse,
    summary="Batch sync progress events from client",
)
@limiter.limit("30/minute")
async def sync_events(
    request: Request,
    payload: SyncRequest,
    db: Session = Depends(get_db),
) -> SyncResponse:
    return process_sync(payload, db)
