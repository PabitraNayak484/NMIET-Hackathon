// ============================================================
// Tool: generate_explanation
// Offline: template from content pack + glossary
// Online:  LLM rephrase via /api/llm/rephrase (with validation)
// ============================================================
import type { ToolResult, Explanation, ContentBundle, LangCode } from '../../types';
import { localize } from '../../i18n/render';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const LLM_TIMEOUT_MS = 6000;

export async function generateExplanation(
  bundle: ContentBundle,
  classNum: number,
  language: LangCode,
  useLLM: boolean
): Promise<ToolResult<Explanation>> {
  const t0 = Date.now();
  const lang = bundle.fallback_language ?? language;

  // Build base explanation from template (always works offline)
  const templateText = buildTemplateExplanation(bundle, lang, classNum);

  if (!useLLM) {
    return {
      ok: true,
      data: {
        text: templateText,
        glossaryChips: bundle.glossaryChips,
        mode: 'template',
        source_pack: bundle.topic.topic_id,
      },
      durationMs: Date.now() - t0,
    };
  }

  // Online path: attempt LLM rephrase
  try {
    const protectedTerms = bundle.glossaryChips
      .filter(g => g.protected)
      .map(g => g.term[language] ?? g.term.en ?? g.term_id);

    const response = await fetchWithTimeout(`${API_BASE}/llm/rephrase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic_id: bundle.topic.topic_id,
        class: classNum,
        language,
        source_text: templateText,
        protected_terms: protectedTerms,
        max_words: classNum <= 5 ? 60 : classNum <= 8 ? 90 : 120,
      }),
    }, LLM_TIMEOUT_MS);

    if (response.ok) {
      const json = await response.json();
      if (json.validated && json.text) {
        return {
          ok: true,
          data: {
            text: json.text,
            glossaryChips: bundle.glossaryChips,
            mode: 'llm_rephrase',
            source_pack: bundle.topic.topic_id,
          },
          durationMs: Date.now() - t0,
        };
      }
    }
  } catch (_e) {
    // LLM unavailable or timed out → fall back to template silently
  }

  return {
    ok: true,
    data: {
      text: templateText,
      glossaryChips: bundle.glossaryChips,
      mode: 'template',
      source_pack: bundle.topic.topic_id,
    },
    durationMs: Date.now() - t0,
  };
}

// ---- Helpers ------------------------------------------------

function buildTemplateExplanation(
  bundle: ContentBundle,
  lang: LangCode,
  classNum: number
): string {
  const parts: string[] = [];

  for (const concept of bundle.topic.concepts) {
    const { text } = localize(concept.content as Record<string, string>, lang);
    parts.push(text);

    // Add one example appropriate for class band
    const examples = concept.examples[lang] ?? concept.examples['en'] ?? [];
    if (examples.length > 0) {
      const idx = classNum <= 5 ? 0 : classNum <= 8 ? 0 : Math.min(1, examples.length - 1);
      parts.push('\n\n📌 ' + examples[idx]);
    }
  }

  return parts.join('\n\n');
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
