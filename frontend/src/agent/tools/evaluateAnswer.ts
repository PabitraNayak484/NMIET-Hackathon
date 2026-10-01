// ============================================================
// Tool: evaluate_answer
// MCQ: exact option key match
// Short answer: keyword overlap against accepted answers
// ============================================================
import type { ToolResult, AssessmentResult, QuizQuestion } from '../../types';

export async function evaluateAnswer(
  question: QuizQuestion,
  chosenOptionId: string
): Promise<ToolResult<AssessmentResult>> {
  const t0 = Date.now();

  if (question.type === 'mcq' || question.type === 'true_false') {
    const chosen = question.options.find(o => o.id === chosenOptionId);
    const correct = !!chosen?.correct;
    const misconception_id = chosen?.misconception_id ?? null;

    return {
      ok: true,
      data: {
        question_id: question.question_id,
        correct,
        confidence: 1.0, // MCQ is deterministic
        reasoning_category: 'option_match',
        misconception_id,
      },
      durationMs: Date.now() - t0,
    };
  }

  // Short answer: keyword match
  const correctOption = question.options.find(o => o.correct);
  const acceptedText  = correctOption?.text.en?.toLowerCase() ?? '';
  const studentText   = chosenOptionId.toLowerCase().trim();
  const keywords      = acceptedText.split(/\s+/).filter(k => k.length > 3);
  const matches       = keywords.filter(k => studentText.includes(k));
  const score         = keywords.length > 0 ? matches.length / keywords.length : 0;

  return {
    ok: true,
    data: {
      question_id: question.question_id,
      correct: score >= 0.6,
      partial: score >= 0.3 && score < 0.6,
      confidence: score,
      reasoning_category: 'key_match',
      misconception_id: null,
    },
    durationMs: Date.now() - t0,
  };
}
