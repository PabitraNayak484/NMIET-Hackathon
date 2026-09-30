// ============================================================
// Tool: get_student_profile
// ============================================================
import { getProfile } from '../../db/repo';
import type { ToolResult, StudentProfile } from '../../types';

export async function getStudentProfile(
  student_id: string
): Promise<ToolResult<StudentProfile>> {
  const t0 = Date.now();
  const profile = await getProfile(student_id);
  return {
    ok: !!profile,
    data: profile,
    error: profile ? undefined : `Profile not found: ${student_id}`,
    durationMs: Date.now() - t0,
  };
}
