// ============================================================
// Tool: get_learning_state
// ============================================================
import { getLearningState } from '../../db/repo';
import type { ToolResult, LearnerState } from '../../types';

export async function getLearningStateTool(
  student_id: string,
  topic_id: string
): Promise<ToolResult<LearnerState>> {
  const t0 = Date.now();
  try {
    const state = await getLearningState(student_id, topic_id);
    return { ok: true, data: state, durationMs: Date.now() - t0 };
  } catch (err) {
    return { ok: false, error: String(err), durationMs: Date.now() - t0 };
  }
}
