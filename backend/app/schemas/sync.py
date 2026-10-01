"""
schemas/sync.py — Pydantic models for POST /api/sync request & response.
Mirrors the client ProgressEvent type (types.ts).
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class EventPayload(BaseModel):
    """A single progress event from the client (mirrors TypeScript ProgressEvent)."""
    event_id: str = Field(..., description="UUIDv4 — idempotency key")
    student_id: str
    topic_id: str
    event_type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    client_timestamp: str = Field(..., description="ISO-8601 wall-clock time on client")
    seq: int = Field(..., description="Monotonic per-device counter (MR-50)")
    device_id: str


class StudentRef(BaseModel):
    id: str


class SyncRequest(BaseModel):
    device_id: str
    student: StudentRef
    events: list[EventPayload] = Field(..., max_length=50)


class RejectedEvent(BaseModel):
    event_id: str
    reason: str


class ServerState(BaseModel):
    topic_id: str
    mastery_score: float
    attempt_count: int
    correct_count: int


class SyncResponse(BaseModel):
    accepted: list[str]     # event_ids accepted and stored
    duplicates: list[str]   # event_ids already present — client may mark synced
    rejected: list[RejectedEvent]
    server_state: list[ServerState]
