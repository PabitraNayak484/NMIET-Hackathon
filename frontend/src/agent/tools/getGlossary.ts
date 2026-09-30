// ============================================================
// Tool: get_glossary
// ============================================================
import { getGlossaryEntry } from '../../db/repo';
import type { ToolResult, GlossaryEntry, LangCode } from '../../types';

export async function getGlossaryTool(
  term_id: string,
  language: LangCode
): Promise<ToolResult<GlossaryEntry>> {
  const t0 = Date.now();
  // Try exact language first, then English fallback
  const entry = await getGlossaryEntry(term_id, language)
             ?? await getGlossaryEntry(term_id, 'en');
  return {
    ok: !!entry,
    data: entry,
    error: entry ? undefined : `Glossary term not found: ${term_id}`,
    durationMs: Date.now() - t0,
  };
}
