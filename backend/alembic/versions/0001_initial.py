"""create initial tables

Revision ID: 0001_initial
Revises: 
Create Date: 2026-10-01

Creates: students, progress_events, learning_state_snapshots, escalations
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "students",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "progress_events",
        sa.Column("event_id", sa.String(36), primary_key=True),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("students.id"), index=True, nullable=False),
        sa.Column("topic_id", sa.String(128), index=True, nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("payload", sa.Text(), server_default="{}"),
        sa.Column("client_timestamp", sa.String(32), nullable=False),
        sa.Column("seq", sa.BigInteger(), index=True, nullable=False),
        sa.Column("device_id", sa.String(64), index=True, nullable=False),
        sa.Column("received_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "learning_state_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("students.id"), index=True, nullable=False),
        sa.Column("topic_id", sa.String(128), index=True, nullable=False),
        sa.Column("mastery_score", sa.Float(), server_default="0.0"),
        sa.Column("attempt_count", sa.Integer(), server_default="0"),
        sa.Column("correct_count", sa.Integer(), server_default="0"),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "escalations",
        sa.Column("escalation_id", sa.String(36), primary_key=True),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("students.id"), index=True, nullable=False),
        sa.Column("topic_or_question", sa.Text(), nullable=False),
        sa.Column("language", sa.String(8), nullable=False),
        sa.Column("status", sa.String(16), server_default="waiting"),
        sa.Column("reply", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("replied_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("escalations")
    op.drop_table("learning_state_snapshots")
    op.drop_table("progress_events")
    op.drop_table("students")
