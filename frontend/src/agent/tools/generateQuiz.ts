// ============================================================
// Tool: generate_quiz
// MR-20: shuffles option order each attempt
// MR-21: excludes questions already seen in this bank cycle
// ============================================================
import { db } from '../../db/schema';
import { getUnseenQuestions, markQuestionSeen } from '../../db/repo';
import type { ToolResult, QuizQuestion, QuizOption, LangCode } from '../../types';
import { masteryToDifficultyBand } from '../mastery';

export async function generateQuiz(
  topic_id: string,
  _language: LangCode,
  mastery: number,
  profile_id: string,   // MR-21: needed to track seen questions per profile
  count = 3
): Promise<ToolResult<QuizQuestion[]>> {
  const t0 = Date.now();
  const difficulty = masteryToDifficultyBand(mastery);

  // Load the full bank for this topic
  const allBank = await db.quiz_bank.where('topic_id').equals(topic_id).toArray();
  if (allBank.length === 0) {
    return { ok: false, error: `No quiz questions found for topic: ${topic_id}`, durationMs: Date.now() - t0 };
  }

  // MR-21: prefer questions not yet seen in this bank cycle
  const preferred = difficulty
    ? allBank.filter(q => q.difficulty === difficulty)
    : allBank;

  const unseenInBand = await getUnseenQuestions(profile_id, topic_id, preferred);

  // Top up from remaining bank if the band is too small
  let candidates = unseenInBand.length >= count
    ? unseenInBand
    : await getUnseenQuestions(profile_id, topic_id, allBank);

  const selected = candidates.slice(0, count);

  // Mark selected questions as seen (MR-21)
  await Promise.all(
    selected.map(q => markQuestionSeen(profile_id, topic_id, q.question_id))
  );

  // MR-20: shuffle the options on each question so position can't be memorised
  const withShuffledOptions = selected.map(q => ({
    ...q,
    options: shuffleOptions(q.options),
  }));

  return { ok: true, data: withShuffledOptions, durationMs: Date.now() - t0 };
}

// ---- Helpers ------------------------------------------------

/** Fisher-Yates shuffle on option array — IDs are preserved (MR-20). */
function shuffleOptions(options: QuizOption[]): QuizOption[] {
  const arr = [...options];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
