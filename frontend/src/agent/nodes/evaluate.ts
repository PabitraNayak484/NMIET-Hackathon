// Node: EVALUATE — score student's answer + detect misconception
import type { AgentContext } from '../../types';
import { evaluateAnswer }    from '../tools/evaluateAnswer';
import { detectMisconception } from '../tools/detectMisconception';

export async function runEvaluate(ctx: AgentContext): Promise<AgentContext> {
  const t0 = Date.now();
  const chosenId = ctx.input.choiceId;
  const quiz     = ctx.quiz;

  if (!quiz || quiz.length === 0 || !chosenId) {
    return { ...ctx, trace: [...ctx.trace, { node: 'EVALUATE', error: 'Missing quiz or answer', durationMs: Date.now() - t0 }] };
  }

  // Evaluate the first unanswered question (simplified: always Q0 for now)
  const question = quiz[0];
  const evalResult = await evaluateAnswer(question, chosenId);
  const mcResult   = await detectMisconception(question, chosenId, ctx.topicId ?? '');

  const assessment = {
    ...evalResult.data!,
    misconception_id: mcResult.data?.misconception_id ?? null,
  };

  const step = {
    node: 'EVALUATE',
    tool: ['evaluate_answer', 'detect_misconception'],
    detected: {
      correct:          assessment.correct,
      misconception_id: assessment.misconception_id,
    },
    durationMs: Date.now() - t0,
  };

  return {
    ...ctx,
    assessment,
    trace: [...ctx.trace, step],
  };
}
