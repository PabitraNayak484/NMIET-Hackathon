"""
services/llm_gateway.py — Qwen 3 LLM call via OpenRouter with anti-hallucination output validation.

Provider: OpenRouter (openrouter.ai) — OpenAI-compatible chat completions API.
Model:    qwen/qwen3-235b-a22b (or configured via QWEN_MODEL env var).

Validation rules (Phase 4, anti-hallucination):
  1. All protected_terms present (case-insensitive)
  2. All numbers/formulas from source_text preserved in output
  3. No new numbers not present in source
  4. Length within class-band word limit
  5. Script detection: Odia (U+0B00–U+0B7F), Devanagari (U+0900–U+097F)
  6. Any failure → raise ValueError; caller uses template fallback
"""
from __future__ import annotations

import logging
import re
import unicodedata
from typing import NamedTuple

import httpx

from ..config import settings

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Class-band word limits
# ---------------------------------------------------------------------------
_CLASS_WORD_LIMIT: dict[tuple[int, int], int] = {
    (1, 3): 60,
    (4, 6): 100,
    (7, 9): 150,
    (10, 12): 200,
}

_ODIA_RANGE = re.compile(r"[\u0B00-\u0B7F]")
_DEVA_RANGE = re.compile(r"[\u0900-\u097F]")
_NUMBER_RE = re.compile(r"\b\d+(?:[.,]\d+)?\b")

_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
_MODEL          = "qwen/qwen3-235b-a22b"  # override via QWEN_MODEL env var
_SITE_URL       = "https://github.com/nmiet-hackathon/sathi"  # OpenRouter attribution
_APP_NAME       = "SATHI"


class LLMResult(NamedTuple):
    text: str
    validated: bool
    fallback: bool


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

async def rephrase(
    topic_id: str,
    class_num: int,
    language: str,
    source_text: str,
    protected_terms: list[str],
    max_words: int,
) -> LLMResult:
    """
    Call Anthropic to rephrase `source_text` and validate the output.
    Returns (text, validated=True, fallback=False) on success.
    Returns (source_text, validated=False, fallback=True) if the API key is
    absent, the network fails, or the output fails validation.
    """
    if not settings.openrouter_api_key:
        log.warning("[LLM] No OpenRouter API key — using template fallback")
        return LLMResult(text=source_text, validated=False, fallback=True)

    word_limit = _word_limit_for_class(class_num)
    effective_max = min(max_words, word_limit)

    prompt = _build_prompt(
        source_text=source_text,
        language=language,
        protected_terms=protected_terms,
        max_words=effective_max,
    )

    try:
        raw = await _call_qwen(prompt, settings.qwen_model or _MODEL)
    except Exception as exc:
        log.warning("[LLM] API call failed: %s — using fallback", exc)
        return LLMResult(text=source_text, validated=False, fallback=True)

    try:
        _validate(
            output=raw,
            source_text=source_text,
            language=language,
            protected_terms=protected_terms,
            max_words=effective_max,
        )
    except ValueError as exc:
        log.warning("[LLM] Validation failed: %s — using fallback", exc)
        return LLMResult(text=source_text, validated=False, fallback=True)

    return LLMResult(text=raw, validated=True, fallback=False)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _word_limit_for_class(class_num: int) -> int:
    for (lo, hi), limit in _CLASS_WORD_LIMIT.items():
        if lo <= class_num <= hi:
            return limit
    return 150


def _build_prompt(
    source_text: str,
    language: str,
    protected_terms: list[str],
    max_words: int,
) -> str:
    lang_name = {"en": "English", "hi": "Hindi", "or": "Odia"}.get(language, language)
    terms_str = ", ".join(f'"{t}"' for t in protected_terms) if protected_terms else "none"

    return (
        f"You are SATHI, an AI teaching assistant for Indian school students.\n"
        f"Rephrase the following curriculum explanation into simple, friendly {lang_name}.\n\n"
        f"Rules:\n"
        f"- Use at most {max_words} words.\n"
        f"- Keep all of these terms verbatim: {terms_str}.\n"
        f"- Preserve every number and formula exactly.\n"
        f"- Do not add new facts, entities, or numbers.\n"
        f"- Output only the rephrased text — no preamble, no quotes.\n\n"
        f"Original text:\n{source_text}"
    )


async def _call_qwen(prompt: str, model: str) -> str:
    """
    Call Qwen 3 via OpenRouter using the OpenAI-compatible chat completions API.
    Raises httpx.HTTPStatusError or httpx.TimeoutException on failure.
    """
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": _SITE_URL,       # Required by OpenRouter for attribution
        "X-Title": _APP_NAME,
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "max_tokens": 512,
        "temperature": 0.3,   # low temperature for deterministic curriculum text
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are SATHI, an AI teaching assistant for Indian school students. "
                    "You rephrase curriculum explanations in simple, friendly language. "
                    "You NEVER add new facts. You ALWAYS preserve protected terms and numbers exactly."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(_OPENROUTER_URL, json=body, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        # OpenAI-compatible response format
        return data["choices"][0]["message"]["content"].strip()


def _validate(
    output: str,
    source_text: str,
    language: str,
    protected_terms: list[str],
    max_words: int,
) -> None:
    """Raise ValueError with a descriptive message if any guard fails."""
    # 1. Protected terms present
    for term in protected_terms:
        if term.lower() not in output.lower():
            raise ValueError(f"Protected term missing: '{term}'")

    # 2. Numbers from source preserved in output
    src_nums = set(_NUMBER_RE.findall(source_text))
    out_nums = set(_NUMBER_RE.findall(output))
    missing_nums = src_nums - out_nums
    if missing_nums:
        raise ValueError(f"Numbers from source missing in output: {missing_nums}")

    # 3. No new numbers introduced
    new_nums = out_nums - src_nums
    if new_nums:
        raise ValueError(f"Output introduced new numbers: {new_nums}")

    # 4. Word count within limit
    word_count = len(output.split())
    if word_count > max_words * 1.1:  # 10% grace
        raise ValueError(f"Output too long: {word_count} words (limit {max_words})")

    # 5. Script detection — must match expected language
    if language == "or":
        if not _ODIA_RANGE.search(output):
            raise ValueError("Odia output contains no Odia script characters")
    elif language == "hi":
        if not _DEVA_RANGE.search(output):
            raise ValueError("Hindi output contains no Devanagari script characters")
