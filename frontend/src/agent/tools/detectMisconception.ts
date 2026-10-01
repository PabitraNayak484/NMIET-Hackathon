// ============================================================
// Tool: detect_misconception
// Maps chosen distractor → misconception_id using the pack's
// option-level misconception tags (works fully offline).
// ============================================================
import type { ToolResult, QuizQuestion } from '../../types';

export interface MisconceptionResult {
  misconception_id: string | null;
  topic_id: string;
}

export async function detectMisconception(
  question: QuizQuestion,
  chosenOptionId: string,
  topic_id: string
): Promise<ToolResult<MisconceptionResult>> {
  const t0 = Date.now();
  const chosen = question.options.find(o => o.id === chosenOptionId);
  const misconception_id = chosen?.misconception_id ?? null;

  return {
    ok: true,
    data: { misconception_id, topic_id },
    durationMs: Date.now() - t0,
  };
}
