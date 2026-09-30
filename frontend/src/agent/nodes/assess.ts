// Node: ASSESS — generate quiz questions
import type { AgentContext } from '../../types';
import { generateQuiz } from '../tools/generateQuiz';

export async function runAssess(ctx: AgentContext): Promise<AgentContext> {
  const t0 = Date.now();
  const topicId = ctx.topicId ?? ctx.intent?.topic_id;
  const lang    = ctx.profile?.language ?? 'en';
  const mastery = ctx.learnerState?.mastery_score ?? 0.3;

  if (!topicId) {
    return { ...ctx, trace: [...ctx.trace, { node: 'ASSESS', error: 'No topic_id', durationMs: Date.now() - t0 }] };
  }

  // Only generate quiz if plan says quiz/practice/review; else skip
  const action = ctx.plan?.action;
  if (action && !['quiz', 'practice', 'review'].includes(action)) {
    const step = { node: 'ASSESS', tool: 'generate_quiz', questions: 0, durationMs: Date.now() - t0 };
    return { ...ctx, trace: [...ctx.trace, step] };
  }

  const result = await generateQuiz(topicId, lang, mastery, 3);

  const step = {
    node:      'ASSESS',
    tool:      'generate_quiz',
    questions: result.data?.length ?? 0,
    durationMs: Date.now() - t0,
  };

  return {
    ...ctx,
    quiz:  result.data,
    trace: [...ctx.trace, step],
  };
}
