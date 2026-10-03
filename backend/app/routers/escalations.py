"""
routers/escalations.py — teacher escalation flow (MR-60, MR-61).

  POST   /api/escalations              → student submits escalation
  GET    /api/escalations/{id}         → student polls status (MR-61)
  PATCH  /api/escalations/{id}/reply   → teacher adds reply (MR-60)
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.student import Escalation, Student
from ..security import limiter

router = APIRouter(prefix="/api/escalations", tags=["escalations"])


# ---- Request / Response schemas ------------------------------------

class EscalationCreate(BaseModel):
    student_id: str
    topic_or_question: str = Field(..., max_length=1000)
    language: str = Field(..., max_length=8)


class EscalationStatus(BaseModel):
    escalation_id: str
    status: str          # "waiting" | "replied"
    reply: str | None
    created_at: str
    replied_at: str | None


class ReplyPayload(BaseModel):
    reply: str = Field(..., min_length=1, max_length=2000)


# ---- Endpoints -----------------------------------------------------

@router.post(
    "",
    response_model=EscalationStatus,
    status_code=201,
    summary="Student submits a question for teacher escalation",
)
@limiter.limit("10/minute")
async def create_escalation(
    request: Request,
    payload: EscalationCreate,
    db: Session = Depends(get_db),
) -> EscalationStatus:
    # Ensure student row exists
    student = db.get(Student, payload.student_id)
    if student is None:
        student = Student(id=payload.student_id)
        db.add(student)
        db.flush()

    escalation = Escalation(
        escalation_id=str(uuid4()),
        student_id=payload.student_id,
        topic_or_question=payload.topic_or_question,
        language=payload.language,
        status="waiting",
    )
    db.add(escalation)
    db.flush()

    return _to_status(escalation)


@router.get(
    "/{escalation_id}",
    response_model=EscalationStatus,
    summary="Poll escalation status (student)",
)
async def get_escalation(
    escalation_id: str,
    db: Session = Depends(get_db),
) -> EscalationStatus:
    esc = db.get(Escalation, escalation_id)
    if esc is None:
        raise HTTPException(status_code=404, detail="Escalation not found")
    return _to_status(esc)


@router.patch(
    "/{escalation_id}/reply",
    response_model=EscalationStatus,
    summary="Teacher adds a reply to an escalation (MR-60)",
)
async def reply_escalation(
    escalation_id: str,
    payload: ReplyPayload,
    db: Session = Depends(get_db),
) -> EscalationStatus:
    esc = db.get(Escalation, escalation_id)
    if esc is None:
        raise HTTPException(status_code=404, detail="Escalation not found")
    if esc.status == "replied":
        raise HTTPException(status_code=409, detail="Escalation already replied")

    esc.reply = payload.reply
    esc.status = "replied"
    esc.replied_at = datetime.now(timezone.utc)
    db.flush()

    return _to_status(esc)


# ---- Helper --------------------------------------------------------

def _to_status(esc: Escalation) -> EscalationStatus:
    return EscalationStatus(
        escalation_id=esc.escalation_id,
        status=esc.status,
        reply=esc.reply,
        created_at=esc.created_at.isoformat(),
        replied_at=esc.replied_at.isoformat() if esc.replied_at else None,
    )
