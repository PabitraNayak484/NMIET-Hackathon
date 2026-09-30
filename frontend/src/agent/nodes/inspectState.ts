// Node: INSPECT_STATE — load profile + learning state
import type { AgentContext } from '../../types';
import { getStudentProfile }    from '../tools/getStudentProfile';
import { getLearningStateTool } from '../tools/getLearningState';

export async function runInspectState(ctx: AgentContext): Promise<AgentContext> {
  const t0 = Date.now();
  const topicId = ctx.topicId ?? ctx.intent?.topic_id ?? 'unknown';

  const [profileResult, stateResult] = await Promise.all([
    getStudentProfile(ctx.studentId),
    getLearningStateTool(ctx.studentId, topicId),
  ]);

  const step = {
    node:  'INSPECT_STATE',
    tool:  ['get_student_profile', 'get_learning_state'],
    state: stateResult.data ? {
      mastery_score:  stateResult.data.mastery_score,
      attempt_count:  stateResult.data.attempt_count,
      misconceptions: stateResult.data.misconceptions,
      confidence:     stateResult.data.confidence,
    } : undefined,
    durationMs: Date.now() - t0,
  };

  return {
    ...ctx,
    profile:      profileResult.data ?? ctx.profile,
    learnerState: stateResult.data,
    trace:        [...ctx.trace, step],
  };
}
