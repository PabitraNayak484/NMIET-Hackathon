// ============================================================
// Tool: save_local_progress
// MR-50: event carries seq (auto-assigned in repo) + client_timestamp
// MR-14: saves resume_state when step = quiz mid-session
// ============================================================
import { appendProgressEvent, saveResumeState, clearResumeState } from '../../db/repo';
import type { ToolResult, ProgressEvent, EventType, ResumeState } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export interface SaveProgressInput {
  student_id:    string;
  topic_id:      string;
  event_type:    EventType;
  payload:       Record<string, unknown>;
  device_id:     string;
  // MR-14 resume support — omit when not in an interruptible quiz
  resume?:       Omit<ResumeState, 'profile_id' | 'topic_id' | 'timestamp'> | null;
  profile_id?:   string;
  clear_resume?: boolean;  // set true when topic is fully completed
}

export interface SaveProgressResult {
  event_id: string;
  saved:    boolean;
}

export async function saveLocalProgress(
  input: SaveProgressInput
): Promise<ToolResult<SaveProgressResult>> {
  const t0 = Date.now();
  const now = new Date().toISOString();

  const event: ProgressEvent = {
    event_id:         uuidv4(),
    student_id:       input.student_id,
    topic_id:         input.topic_id,
    event_type:       input.event_type,
    payload:          input.payload,
    timestamp:        now,
    client_timestamp: now,     // MR-50: set at creation; seq auto-assigned in repo
    seq:              0,       // will be overwritten inside appendProgressEvent
    sync_status:      'pending',
    device_id:        input.device_id,
  };

  try {
    await appendProgressEvent(event);

    // MR-14: persist or clear resume state alongside the event
    if (input.profile_id) {
      if (input.clear_resume) {
        await clearResumeState(input.profile_id, input.topic_id);
      } else if (input.resume) {
        const rs: ResumeState = {
          ...input.resume,
          profile_id: input.profile_id,
          topic_id:   input.topic_id,
          timestamp:  now,
        };
        await saveResumeState(rs);
      }
    }

    return { ok: true, data: { event_id: event.event_id, saved: true }, durationMs: Date.now() - t0 };
  } catch (err) {
    return { ok: false, error: String(err), durationMs: Date.now() - t0 };
  }
}
