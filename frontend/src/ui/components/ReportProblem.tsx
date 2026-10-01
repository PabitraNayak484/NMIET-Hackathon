// ReportProblem — flag button that creates a content_flagged progress event (MR-15)
import React, { useState } from 'react';

interface Props {
  topicId: string;
  questionId?: string;
  studentId: string;
  onReport?: () => void;
}

export function ReportProblem({ topicId, questionId, studentId, onReport }: Props) {
  const [reported, setReported] = useState(false);

  async function handleReport() {
    if (reported) return;
    setReported(true);

    // Dynamic import to avoid circular deps
    const { appendProgressEvent } = await import('../../db/repo');
    const uuidModule = await import('uuid');
    const uuidv4 = uuidModule.v4;
    const deviceId = localStorage.getItem('sathi_device_id') ?? 'unknown';

    await appendProgressEvent({
      event_id: uuidv4(),
      student_id: studentId,
      topic_id: topicId,
      event_type: 'content_flagged',
      payload: { question_id: questionId ?? null, flagged_at: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      client_timestamp: new Date().toISOString(),
      seq: 0, // will be auto-incremented inside appendProgressEvent
      sync_status: 'pending',
      device_id: deviceId,
    });

    onReport?.();
  }

  return (
    <button
      id="report-problem-btn"
      className="btn btn-ghost btn-sm"
      onClick={handleReport}
      disabled={reported}
      aria-label="Report a problem with this content"
      aria-pressed={reported}
      style={{ fontSize: 'var(--text-xs)', gap: 4 }}
    >
      <span aria-hidden="true">{reported ? '✅' : '⚑'}</span>
      {reported ? 'Reported' : 'Report problem'}
    </button>
  );
}
