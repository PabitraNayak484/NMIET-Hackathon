// ============================================================
// Tool: update_mastery
// Applies the deterministic mastery formula and persists state.
// ============================================================
import { getLearningState, saveLearningState } from '../../db/repo';
import {
  computeMastery, applyMisconductPenalty,
  updateConfidenceWithSelfReport
} from '../mastery';
import type { ToolResult, LearnerState, AssessmentResult, SelfDifficulty } from '../../types';


export interface MasteryUpdate {
  previous: number;
  updated:  number;
  delta:    number;
  state:    LearnerState;
  misconception_cleared?: string;
}

export async function updateMastery(
  student_id:      string,
  topic_id:        string,
  assessment:      AssessmentResult,
  selfDifficulty?: SelfDifficulty   // MR-12: optional self-report from UI tap
): Promise<ToolResult<MasteryUpdate>> {

  const t0    = Date.now();
  const state = await getLearningState(student_id, topic_id);

  const result    = assessment.correct ? 1.0 : (assessment.partial ? 0.5 : 0.0) as 1.0 | 0.5 | 0.0;
  const difficulty = 'medium'; // default; can be passed from quiz metadata
  let   newMastery = computeMastery(state.mastery_score, result, difficulty);

  // Misconception handling
  let misconception_cleared: string | undefined;
  let newMisconceptions = [...state.misconceptions];

  if (!assessment.correct && assessment.misconception_id) {
    // Add misconception if not already tracked
    if (!newMisconceptions.includes(assessment.misconception_id)) {
      newMisconceptions.push(assessment.misconception_id);
    }
    newMastery = applyMisconductPenalty(newMastery);
  }

  // Check if a misconception was cleared (2 consecutive correct answers)
  for (const mc of [...newMisconceptions]) {
    // Simplified: if correct and the misconception is in list, clear it
    if (assessment.correct && newMisconceptions.includes(mc)) {
      if (state.correct_count > 0) { // at least one previous correct
        newMisconceptions = newMisconceptions.filter(m => m !== mc);
        misconception_cleared = mc;
      }
    }
  }

  // Confidence: blend rolling avg with self-report (MR-12)
  const historyBool = assessment.correct;
  const newConfidence = updateConfidenceWithSelfReport(
    Array(state.attempt_count).fill(state.confidence > 0.5)
      .concat([historyBool]),
    selfDifficulty
  );

  const updated: LearnerState = {
    ...state,
    mastery_score:  newMastery,
    confidence:     newConfidence,
    attempt_count:  state.attempt_count + 1,
    correct_count:  state.correct_count + (assessment.correct ? 1 : 0),
    misconceptions: newMisconceptions,
    last_activity:  new Date().toISOString(),
  };

  await saveLearningState(updated);

  return {
    ok: true,
    data: {
      previous: state.mastery_score,
      updated:  newMastery,
      delta:    newMastery - state.mastery_score,
      state:    updated,
      misconception_cleared,
    },
    durationMs: Date.now() - t0,
  };
}
