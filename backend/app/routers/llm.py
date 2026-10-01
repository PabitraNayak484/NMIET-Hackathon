"""
routers/llm.py — POST /api/llm/rephrase
LLM gateway: rephrases curriculum text using Anthropic Claude.
Validates output against anti-hallucination rules before returning.
Falls back to the original source_text if the API is unavailable or fails validation.
"""
from __future__ import annotations

from fastapi import APIRouter, Request

from ..schemas.llm import RephraseRequest, RephraseResponse
from ..security import limiter
from ..services.llm_gateway import rephrase

router = APIRouter(prefix="/api/llm", tags=["llm"])


@router.post(
    "/rephrase",
    response_model=RephraseResponse,
    summary="Rephrase curriculum text via LLM with anti-hallucination validation",
)
@limiter.limit("20/minute")
async def rephrase_text(
    request: Request,
    payload: RephraseRequest,
) -> RephraseResponse:
    result = await rephrase(
        topic_id=payload.topic_id,
        class_num=payload.class_num,
        language=payload.language,
        source_text=payload.source_text,
        protected_terms=payload.protected_terms,
        max_words=payload.max_words,
    )
    return RephraseResponse(
        text=result.text,
        validated=result.validated,
        fallback=result.fallback,
    )
