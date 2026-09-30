// Node: ACT_NEXT — choose next micro-activity from updated state
import type { AgentContext } from '../../types';
import { selectNextActionTool } from '../tools/selectNextAction';
import { saveLocalProgress }    from '../tools/saveLocalProgress';

export async function runActNext(ctx: AgentContext): Promise<AgentContext> {
  const t0 = Date.now();
  if (!ctx.learnerState) {
    return { ...ctx, trace: [...ctx.trace, { node: 'ACT_NEXT', error: 'No learner state', durationMs: Date.now() - t0 }] };
  }

  const topic     = ctx.content?.topic;
  const prereqIds = topic?.prerequisites ?? [];

  const result = await selectNextActionTool(
    ctx.learnerState,
    ctx.assessment ?? null,
    ctx.network,
    prereqIds,
    !!ctx.topicId,
    true,
    20
  );

  // Persist next_action selection as a progress event
  if (result.data && ctx.topicId) {
    await saveLocalProgress({
      student_id: ctx.studentId,
      topic_id:   ctx.topicId,
      event_type: 'next_action_selected',
      payload:    { action: result.data.action, reason: result.data.reason, rule_id: result.data.ruleId },
      device_id:  ctx.deviceId,
    });
  }

  const step = {
    node:   'ACT_NEXT',
    tool:   'select_next_action',
    action: result.data?.action,
    reason: result.data?.reason,
    durationMs: Date.now() - t0,
  };

  return {
    ...ctx,
    plan:  result.data,
    trace: [...ctx.trace, step],
  };
}
