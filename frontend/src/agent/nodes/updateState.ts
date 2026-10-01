// Node: UPDATE_STATE — recompute mastery, persist, enqueue sync
import type { AgentContext } from '../../types';
import { updateMastery }     from '../tools/updateMastery';
import { saveLocalProgress } from '../tools/saveLocalProgress';
import { queueSync }         from '../tools/queueSync';

export async function runUpdateState(ctx: AgentContext): Promise<AgentContext> {
  const t0 = Date.now();
  if (!ctx.assessment || !ctx.topicId) {
    return { ...ctx, trace: [...ctx.trace, { node: 'UPDATE_STATE', error: 'Missing assessment or topic', durationMs: Date.now() - t0 }] };
  }

  // 1. Update mastery
  const masteryResult = await updateMastery(ctx.studentId, ctx.topicId, ctx.assessment);

  // 2. Save progress event
  await saveLocalProgress({
    student_id: ctx.studentId,
    topic_id:   ctx.topicId,
    event_type: 'quiz_answered',
    payload: {
      question_id:      ctx.assessment.question_id,
      correct:          ctx.assessment.correct,
      misconception_id: ctx.assessment.misconception_id,
      mastery_before:   masteryResult.data?.previous,
      mastery_after:    masteryResult.data?.updated,
    },
    device_id: ctx.deviceId,
  });

  if (ctx.assessment.misconception_id) {
    await saveLocalProgress({
      student_id: ctx.studentId,
      topic_id:   ctx.topicId,
      event_type: 'misconception_detected',
      payload:    { misconception_id: ctx.assessment.misconception_id },
      device_id:  ctx.deviceId,
    });
  }

  if (masteryResult.data?.misconception_cleared) {
    await saveLocalProgress({
      student_id: ctx.studentId,
      topic_id:   ctx.topicId,
      event_type: 'misconception_cleared',
      payload:    { misconception_id: masteryResult.data.misconception_cleared },
      device_id:  ctx.deviceId,
    });
  }

  // 3. Queue sync
  await queueSync();

  const step = {
    node:   'UPDATE_STATE',
    tool:   ['update_mastery', 'save_local_progress', 'queue_sync'],
    delta:  {
      mastery: masteryResult.data
        ? `${masteryResult.data.previous.toFixed(2)} → ${masteryResult.data.updated.toFixed(2)}`
        : undefined,
    },
    misconception: ctx.assessment.misconception_id ?? undefined,
    durationMs: Date.now() - t0,
  };

  return {
    ...ctx,
    learnerState: masteryResult.data?.state,
    trace:        [...ctx.trace, step],
  };
}
