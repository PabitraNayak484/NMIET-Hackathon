// Node: UNDERSTAND — classify intent and map to topic_id
import type { AgentContext } from '../../types';
import { buildAliasIndex, matchTopic } from '../../content/aliasIndex';
import { getStudentProfile } from '../tools/getStudentProfile';

export async function runUnderstand(ctx: AgentContext): Promise<AgentContext> {
  const t0 = Date.now();

  // Ensure alias index is built
  await buildAliasIndex();

  const profileResult = await getStudentProfile(ctx.studentId);
  const profile = profileResult.data;
  const lang = profile?.language ?? 'en';

  let topicId: string | null = null;
  let score = 0;
  let intentType: 'ask_concept' | 'practice' | 'review' | 'unknown' = 'unknown';

  if (ctx.input.type === 'tap_topic' && ctx.input.topicId) {
    // Direct topic tap — no parsing needed
    topicId = ctx.input.topicId;
    score   = 1.0;
    intentType = 'ask_concept';
  } else if (ctx.input.text) {
    const text = ctx.input.text.trim();
    // Practice/review keyword detection
    if (/practice|quiz|test|try|अभ्यास|ଅଭ୍ୟାସ/i.test(text)) intentType = 'practice';
    else if (/review|revise|repeat|दोहराएं|ଦୋହ୍ରା/i.test(text)) intentType = 'review';

    const match = matchTopic(text, lang);
    if (match && match.score >= 0.6) {
      topicId    = match.topic_id;
      score      = match.score;
      intentType = intentType === 'unknown' ? 'ask_concept' : intentType;
    } else if (match && match.score >= 0.35) {
      // Ambiguous — provide candidates for disambiguation
      topicId = match.topic_id;
      score   = match.score;
    }
  }

  const step = {
    node: 'UNDERSTAND',
    tool: 'get_student_profile',
    detected: { intent: intentType, topic_id: topicId, language: lang, score },
    durationMs: Date.now() - t0,
  };

  return {
    ...ctx,
    profile,
    intent:  { type: intentType, topic_id: topicId, score, language: lang, raw_input: ctx.input.text ?? '' },
    topicId: topicId ?? undefined,
    trace:   [...ctx.trace, step],
  };
}
