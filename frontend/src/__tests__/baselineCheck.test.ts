// ============================================================
// Tests: baselineCheck instrumentation (MR-80)
// Verifies baseline_check and post_check event delta logic.
// Pure function tests — no DB required.
// ============================================================
import { describe, it, expect } from 'vitest';
import { avgMasteryGainPerTopic } from '@/analytics/metrics';
import type { ProgressEvent } from '@/types';

// ---- helpers ------------------------------------------------

let _seq = 0;
function makeEvent(overrides: Partial<ProgressEvent> = {}): ProgressEvent {
  const id = `evt_bc_${_seq++}`;
  return {
    event_id:         id,
    student_id:       'stu_1',
    topic_id:         'photosynthesis',
    event_type:       'baseline_check',
    payload:          {},
    timestamp:        new Date().toISOString(),
    client_timestamp: new Date().toISOString(),
    seq:              _seq,
    sync_status:      'pending',
    device_id:        'dev_1',
    ...overrides,
  };
}

// ---- computeDelta helper (replicated from GapVisualizationPage logic) ------

function computeBaselinePostDelta(
  events: ProgressEvent[],
  topicId: string
): { baseline: number; postCheck: number; delta: number } | null {
  const baselineEvents = events.filter(
    (e) => e.topic_id === topicId && e.event_type === 'baseline_check'
  );
  const postCheckEvents = events.filter(
    (e) => e.topic_id === topicId && e.event_type === 'post_check'
  );

  if (baselineEvents.length === 0 || postCheckEvents.length === 0) return null;

  const lastBaseline  = baselineEvents[baselineEvents.length - 1].payload as Record<string, unknown>;
  const lastPost      = postCheckEvents[postCheckEvents.length - 1].payload as Record<string, unknown>;

  const baseline  = typeof lastBaseline.mastery_score === 'number' ? lastBaseline.mastery_score : 0;
  const postCheck = typeof lastPost.mastery_score     === 'number' ? lastPost.mastery_score     : 0;

  return { baseline, postCheck, delta: postCheck - baseline };
}

// ---- Tests --------------------------------------------------

describe('MR-80: Baseline check instrumentation', () => {
  it('returns null when no baseline or post-check events exist', () => {
    const events = [makeEvent({ event_type: 'quiz_answered' })];
    expect(computeBaselinePostDelta(events, 'photosynthesis')).toBeNull();
  });

  it('returns null when only baseline exists but no post-check', () => {
    const events = [
      makeEvent({ event_type: 'baseline_check', payload: { mastery_score: 0.3 } }),
    ];
    expect(computeBaselinePostDelta(events, 'photosynthesis')).toBeNull();
  });

  it('computes positive delta after successful intervention', () => {
    const events = [
      makeEvent({ event_type: 'baseline_check', payload: { mastery_score: 0.3 } }),
      makeEvent({ event_type: 'post_check',     payload: { mastery_score: 0.57 } }),
    ];
    const result = computeBaselinePostDelta(events, 'photosynthesis');
    expect(result).not.toBeNull();
    expect(result!.delta).toBeCloseTo(0.27);
    expect(result!.baseline).toBeCloseTo(0.3);
    expect(result!.postCheck).toBeCloseTo(0.57);
  });

  it('handles delta badge of "+24%" correctly (sample from build plan)', () => {
    const events = [
      makeEvent({ event_type: 'baseline_check', payload: { mastery_score: 0.3 } }),
      makeEvent({ event_type: 'post_check',     payload: { mastery_score: 0.54 } }),
    ];
    const result = computeBaselinePostDelta(events, 'photosynthesis');
    expect(result).not.toBeNull();
    const pct = Math.round(result!.delta * 100);
    expect(pct).toBe(24);
  });

  it('handles zero delta when there is no improvement', () => {
    const events = [
      makeEvent({ event_type: 'baseline_check', payload: { mastery_score: 0.5 } }),
      makeEvent({ event_type: 'post_check',     payload: { mastery_score: 0.5 } }),
    ];
    const result = computeBaselinePostDelta(events, 'photosynthesis');
    expect(result!.delta).toBeCloseTo(0);
  });

  it('ignores events from other topics', () => {
    const events = [
      makeEvent({ event_type: 'baseline_check', topic_id: 'parts_of_plant', payload: { mastery_score: 0.6 } }),
      makeEvent({ event_type: 'post_check',     topic_id: 'parts_of_plant', payload: { mastery_score: 0.9 } }),
    ];
    expect(computeBaselinePostDelta(events, 'photosynthesis')).toBeNull();
  });

  it('avgMasteryGainPerTopic also reflects baseline-to-post improvement', () => {
    const events = [
      makeEvent({ event_type: 'mastery_updated', seq: 1, payload: { mastery_score: 0.3 } }),
      makeEvent({ event_type: 'mastery_updated', seq: 2, payload: { mastery_score: 0.54 } }),
    ];
    const gain = avgMasteryGainPerTopic(events);
    expect(gain['photosynthesis']).toBeCloseTo(0.24);
  });
});
