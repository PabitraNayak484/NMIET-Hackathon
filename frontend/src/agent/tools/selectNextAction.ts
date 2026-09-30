// ============================================================
// Tool: select_next_action
// Thin wrapper over the pure planner function.
// ============================================================
import { selectNextAction, applyTimeModifier } from '../planner';
import type { ToolResult, LearnerState, AssessmentResult, NetworkStatus, PlanResult } from '../../types';
import { getLearningState } from '../../db/repo';

export async function selectNextActionTool(
  learnerState: LearnerState,
  assessmentResult: AssessmentResult | null,
  networkStatus: NetworkStatus,
  prerequisiteTopicIds: string[],
  topicInPack = true,
  contentConfident = true,
  availableTimeMin = 20
): Promise<ToolResult<PlanResult>> {
  const t0 = Date.now();

  // Load prerequisite mastery scores
  const prerequisiteMastery: Record<string, number> = {};
  for (const topicId of prerequisiteTopicIds) {
    const ps = await getLearningState(learnerState.student_id, topicId);
    prerequisiteMastery[topicId] = ps.mastery_score;
  }

  let result = selectNextAction({
    learnerState,
    assessmentResult,
    networkStatus,
    topicInPack,
    contentConfident,
    prerequisiteMastery,
    availableTimeMin,
  });

  result = applyTimeModifier(result, availableTimeMin);

  return { ok: true, data: result, durationMs: Date.now() - t0 };
}
