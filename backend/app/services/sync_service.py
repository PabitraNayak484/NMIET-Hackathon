"""
services/sync_service.py — validate, deduplicate, and persist progress events.

Ordering rule (MR-50):
  Within a single device session, events are ordered by (device_id, seq).
  client_timestamp is used only for cross-device ordering.
  Events with wrong clocks are accepted and reordered — no future-timestamp rejection.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from ..models.student import LearningStateSnapshot, ProgressEvent, Student
from ..schemas.sync import (
    EventPayload,
    RejectedEvent,
    ServerState,
    SyncRequest,
    SyncResponse,
)

log = logging.getLogger(__name__)

# Max payload size guard (bytes of JSON-serialised payload dict)
MAX_PAYLOAD_BYTES = 65_536  # 64 KB total body enforced at router level


def process_sync(req: SyncRequest, db: Session) -> SyncResponse:
    """
    Validate, deduplicate, and store up to 50 events.
    Returns accepted / duplicate / rejected event_ids plus current server state.
    """
    accepted: list[str] = []
    duplicates: list[str] = []
    rejected: list[RejectedEvent] = []

    # Ensure student row exists (upsert)
    student = db.get(Student, req.student.id)
    if student is None:
        student = Student(id=req.student.id)
        db.add(student)
        db.flush()

    # Sort incoming events by (device_id, seq) — MR-50
    ordered = sorted(req.events, key=lambda e: (e.device_id, e.seq))

    for evt in ordered:
        result = _ingest_event(evt, db)
        if result == "accepted":
            accepted.append(evt.event_id)
        elif result == "duplicate":
            duplicates.append(evt.event_id)
        else:
            rejected.append(RejectedEvent(event_id=evt.event_id, reason=result))

    db.flush()

    # Build server_state for accepted events — replay mastery
    affected_topics = {e.topic_id for e in req.events if e.event_id in accepted}
    server_state = _build_server_state(req.student.id, affected_topics, db)

    return SyncResponse(
        accepted=accepted,
        duplicates=duplicates,
        rejected=rejected,
        server_state=server_state,
    )


def _ingest_event(evt: EventPayload, db: Session) -> str:
    """
    Returns 'accepted', 'duplicate', or a rejection reason string.
    """
    # Basic validation
    if not evt.event_id or len(evt.event_id) > 36:
        return "invalid_event_id"
    if not evt.student_id:
        return "missing_student_id"
    if not evt.topic_id:
        return "missing_topic_id"
    if not evt.event_type:
        return "missing_event_type"
    if not evt.device_id:
        return "missing_device_id"

    # Payload size guard
    payload_str = json.dumps(evt.payload)
    if len(payload_str.encode()) > MAX_PAYLOAD_BYTES:
        return "payload_too_large"

    # Idempotency — check if already stored
    existing = db.get(ProgressEvent, evt.event_id)
    if existing is not None:
        return "duplicate"

    # Store it
    row = ProgressEvent(
        event_id=evt.event_id,
        student_id=evt.student_id,
        topic_id=evt.topic_id,
        event_type=evt.event_type,
        payload=payload_str,
        client_timestamp=evt.client_timestamp,
        seq=evt.seq,
        device_id=evt.device_id,
        received_at=datetime.now(timezone.utc),
    )
    db.add(row)
    return "accepted"


def _build_server_state(
    student_id: str,
    topic_ids: set[str],
    db: Session,
) -> list[ServerState]:
    """
    Replay quiz_answered events for each affected topic to compute mastery.
    Updates (or inserts) LearningStateSnapshot rows.
    """
    results: list[ServerState] = []

    for topic_id in topic_ids:
        # Load all quiz_answered events for this student+topic, ordered by (device_id, seq)
        events = (
            db.query(ProgressEvent)
            .filter(
                ProgressEvent.student_id == student_id,
                ProgressEvent.topic_id == topic_id,
                ProgressEvent.event_type == "quiz_answered",
            )
            .order_by(ProgressEvent.device_id, ProgressEvent.seq)
            .all()
        )

        attempt = 0
        correct = 0
        for ev in events:
            try:
                payload = json.loads(ev.payload)
                attempt += 1
                if payload.get("correct"):
                    correct += 1
            except (json.JSONDecodeError, AttributeError):
                pass

        mastery = (correct / attempt) if attempt > 0 else 0.0

        # Upsert snapshot
        snapshot = (
            db.query(LearningStateSnapshot)
            .filter_by(student_id=student_id, topic_id=topic_id)
            .first()
        )
        if snapshot is None:
            snapshot = LearningStateSnapshot(
                student_id=student_id,
                topic_id=topic_id,
            )
            db.add(snapshot)

        snapshot.mastery_score = round(mastery, 4)
        snapshot.attempt_count = attempt
        snapshot.correct_count = correct

        results.append(
            ServerState(
                topic_id=topic_id,
                mastery_score=snapshot.mastery_score,
                attempt_count=attempt,
                correct_count=correct,
            )
        )

    return results
