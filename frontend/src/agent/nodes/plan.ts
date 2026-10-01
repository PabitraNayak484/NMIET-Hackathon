// Node: PLAN — invoke planner to choose next action
import type { AgentContext } from '../../types';
import { selectNextActionTool } from '../tools/selectNextAction';

export async function runPlan(ctx: AgentContext): Promise<AgentContext> {
  const t0 = Date.now();
  if (!ctx.learnerState) return ctx;

  const topic = ctx.content?.topic ?? null;
  const prereqIds = topic?.prerequisites ?? [];

  const result = await selectNextActionTool(
    ctx.learnerState,
    ctx.assessment ?? null,
    ctx.network,
    prereqIds,
    !!ctx.topicId,      // topicInPack
    true,               // contentConfident (assume true; escalation handled in UNDERSTAND)
    20                  // availableTimeMin default
  );

  const step = {
    node:   'PLAN',
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
