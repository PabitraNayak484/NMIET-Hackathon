"""
schemas/llm.py — Pydantic request/response models for POST /api/llm/rephrase.
"""
from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, Field


class RephraseRequest(BaseModel):
    """
    Client sends this when it wants the LLM to rephrase a curriculum explanation.
    The backend validates the output against protected_terms and class_band limits.
    """
    topic_id: str = Field(..., description="Content topic being explained")
    class_num: int = Field(..., ge=1, le=12, description="Student's class (1–12)")
    language: str = Field(..., description="Target language code: en | hi | or")
    source_text: str = Field(
        ..., min_length=10, max_length=2000,
        description="Original template-generated explanation text",
    )
    protected_terms: list[str] = Field(
        default_factory=list,
        description="Glossary terms that must appear verbatim in the output",
    )
    max_words: Annotated[int, Field(ge=20, le=300)] = 120


class RephraseResponse(BaseModel):
    text: str = Field(..., description="Validated, rephrased explanation")
    validated: bool = Field(..., description="True if LLM output passed all guards")
    fallback: bool = Field(
        default=False,
        description="True if the template (not LLM) was used due to validation failure",
    )
