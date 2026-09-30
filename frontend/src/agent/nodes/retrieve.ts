// Node: RETRIEVE — fetch verified content + glossary
import type { AgentContext } from '../../types';
import { retrieveCurriculumContent } from '../tools/retrieveCurriculumContent';

export async function runRetrieve(ctx: AgentContext): Promise<AgentContext> {
  const t0 = Date.now();
  const topicId = ctx.topicId ?? ctx.intent?.topic_id;
  const lang    = ctx.profile?.language ?? 'en';

  if (!topicId) {
    const step = { node: 'RETRIEVE', error: 'No topic_id to retrieve', durationMs: Date.now() - t0 };
    return { ...ctx, trace: [...ctx.trace, step] };
  }

  // Determine which topic to retrieve (for give_example: same topic; for revise_prerequisite: prereq)
  const retrieveId = ctx.plan?.action === 'revise_prerequisite' && ctx.plan.targetPrerequisite
    ? ctx.plan.targetPrerequisite
    : topicId;

  const result = await retrieveCurriculumContent(retrieveId, lang);

  const step = {
    node:   'RETRIEVE',
    tool:   ['retrieve_curriculum_content', 'get_glossary'],
    source: result.data ? `pack:${result.data.topic.topic_id}` : undefined,
    error:  result.error,
    durationMs: Date.now() - t0,
  };

  return {
    ...ctx,
    content: result.data,
    trace:   [...ctx.trace, step],
  };
}
