// Node: TEACH — generate explanation in target language
import type { AgentContext } from '../../types';
import { generateExplanation } from '../tools/generateExplanation';
import { isLLMAvailable } from '../orchestrator';

export async function runTeach(ctx: AgentContext): Promise<AgentContext> {
  const t0 = Date.now();
  if (!ctx.content) {
    return { ...ctx, trace: [...ctx.trace, { node: 'TEACH', error: 'No content bundle', durationMs: Date.now() - t0 }] };
  }

  const lang    = ctx.profile?.language ?? 'en';
  const classNo = ctx.profile?.class ?? 7;
  const useLLM  = isLLMAvailable();

  const result = await generateExplanation(ctx.content, classNo, lang, useLLM);

  const step = {
    node:   'TEACH',
    tool:   'generate_explanation',
    mode:   result.data?.mode,
    durationMs: Date.now() - t0,
  };

  return {
    ...ctx,
    explanation: result.data,
    trace:       [...ctx.trace, step],
  };
}
