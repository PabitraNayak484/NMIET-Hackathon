// ============================================================
// Tool: retrieve_curriculum_content
// ============================================================
import { getTopicById } from '../../db/repo';
import { getGlossaryForTopic } from '../../db/repo';
import type { ToolResult, ContentBundle, LangCode } from '../../types';

export async function retrieveCurriculumContent(
  topic_id: string,
  language: LangCode
): Promise<ToolResult<ContentBundle>> {
  const t0 = Date.now();
  const topic = await getTopicById(topic_id);
  if (!topic) {
    return { ok: false, error: `Topic not found: ${topic_id}`, durationMs: Date.now() - t0 };
  }

  const glossaryChips = await getGlossaryForTopic(topic_id, language);

  // Fetch prerequisite topics for context
  const prerequisiteTopics = [];
  for (const prereqId of topic.prerequisites) {
    const prereq = await getTopicById(prereqId);
    if (prereq) prerequisiteTopics.push(prereq);
  }

  // Check if the requested language is available
  const hasLang = topic.concepts.some(c => !!c.content[language]);
  const bundle: ContentBundle = {
    topic,
    lang:              hasLang ? language : 'en',
    glossaryChips,
    prerequisiteTopics,
    fallback_language: hasLang ? undefined : 'en',
  };

  return { ok: true, data: bundle, durationMs: Date.now() - t0 };
}
