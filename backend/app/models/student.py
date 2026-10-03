"""
models/student.py — SQLAlchemy ORM models for SATHI backend.
Tables: Student, ProgressEvent, LearningStateSnapshot, Escalation
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)          # UUIDv4 from client
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    events: Mapped[list["ProgressEvent"]] = relationship(back_populates="student")
    snapshots: Mapped[list["LearningStateSnapshot"]] = relationship(back_populates="student")
    escalations: Mapped[list["Escalation"]] = relationship(back_populates="student")


class ProgressEvent(Base):
    """
    Mirrors the client ProgressEvent type.
    Primary key: event_id (UUIDv4 from client) — ensures idempotency.
    seq + device_id together define ordering within a device session (MR-50).
    """
    __tablename__ = "progress_events"

    event_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id"), index=True)
    topic_id: Mapped[str] = mapped_column(String(128), index=True)
    event_type: Mapped[str] = mapped_column(String(64))
    payload: Mapped[str] = mapped_column(Text, default="{}")      # JSON string
    client_timestamp: Mapped[str] = mapped_column(String(32))     # ISO-8601 wall clock
    seq: Mapped[int] = mapped_column(BigInteger, index=True)       # MR-50: monotonic per device
    device_id: Mapped[str] = mapped_column(String(64), index=True) # MR-50
    received_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    student: Mapped["Student"] = relationship(back_populates="events")


class LearningStateSnapshot(Base):
    """
    Latest server-side mastery snapshot per (student, topic).
    Rebuilt by replaying ProgressEvents in (device_id, seq) order.
    """
    __tablename__ = "learning_state_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id"), index=True)
    topic_id: Mapped[str] = mapped_column(String(128), index=True)
    mastery_score: Mapped[float] = mapped_column(default=0.0)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    student: Mapped["Student"] = relationship(back_populates="snapshots")


class Escalation(Base):
    """
    Teacher escalation record — created by student, replied by teacher (MR-60).
    """
    __tablename__ = "escalations"

    escalation_id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUIDv4
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id"), index=True)
    topic_or_question: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(8))
    status: Mapped[str] = mapped_column(String(16), default="waiting")  # waiting | replied
    reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    replied_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    student: Mapped["Student"] = relationship(back_populates="escalations")
