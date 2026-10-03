// ============================================================
// Tests: metrics (MR-81) — 4 pure analytics functions
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  misconceptionRecurrenceRate,
  nextActionCompletionRate,
  avgMasteryGainPerTopic,
  sessionsPerWeek,
} from '@/analytics/metrics';
import type { ProgressEvent } from '@/types';

// ---- Fixture builder ----------------------------------------

let _seq = 0;
function makeEvent(overrides: Partial<ProgressEvent> = {}): ProgressEvent {
  const id = `evt_${_seq++}`;
  return {
    event_id:        id,
    student_id:      'stu_1',
    topic_id:        'photosynthesis',
    event_type:      'quiz_answered',
    payload:         {},
    timestamp:       new Date().toISOString(),
    client_timestamp: new Date().toISOString(),
    seq:             _seq,
    sync_status:     'pending',
    device_id:       'dev_1',
    ...overrides,
  };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// ---- misconceptionRecurrenceRate ----------------------------

describe('misconceptionRecurrenceRate', () => {
  it('returns 0 when no misconception events exist', () => {
    const events = [makeEvent({ event_type: 'quiz_answered' })];
    expect(misconceptionRecurrenceRate(events, 'photosynthesis', 'mc_soil')).toBe(0);
  });

  it('returns 0 when misconception appeared only once', () => {
    const events = [
      makeEvent({
        event_type: 'misconception_detected',
        timestamp:  daysAgo(3),
        payload:    { misconception_id: 'mc_soil' },
      }),
    ];
    expect(misconceptionRecurrenceRate(events, 'photosynthesis', 'mc_soil')).toBe(0);
  });

  it('returns > 0 when misconception reappears on a different day', () => {
    const events = [
      makeEvent({ event_type: 'misconception_detected', timestamp: daysAgo(5), payload: { misconception_id: 'mc_soil' } }),
      makeEvent({ event_type: 'misconception_detected', timestamp: daysAgo(2), payload: { misconception_id: 'mc_soil' } }),
    ];
    const rate = misconceptionRecurrenceRate(events, 'photosynthesis', 'mc_soil');
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThanOrEqual(1);
  });
});

// ---- nextActionCompletionRate -------------------------------

describe('nextActionCompletionRate', () => {
  it('returns 0 when no next_action_selected events', () => {
    expect(nextActionCompletionRate([])).toBe(0);
  });

  it('returns 1 when every suggestion day also has a quiz answer', () => {
    const today = new Date().toISOString();
    const events = [
      makeEvent({ event_type: 'next_action_selected', timestamp: today }),
      makeEvent({ event_type: 'quiz_answered',        timestamp: today }),
    ];
    expect(nextActionCompletionRate(events)).toBe(1);
  });

  it('returns 0 when suggestions have no quiz answers', () => {
    const today = new Date().toISOString();
    const events = [
      makeEvent({ event_type: 'next_action_selected', timestamp: today }),
    ];
    expect(nextActionCompletionRate(events)).toBe(0);
  });
});

// ---- avgMasteryGainPerTopic ---------------------------------

describe('avgMasteryGainPerTopic', () => {
  it('returns empty object when no mastery_updated events', () => {
    expect(avgMasteryGainPerTopic([])).toEqual({});
  });

  it('computes positive gain when mastery increases', () => {
    const events = [
      makeEvent({ event_type: 'mastery_updated', seq: 1, payload: { mastery_score: 0.3 } }),
      makeEvent({ event_type: 'mastery_updated', seq: 2, payload: { mastery_score: 0.6 } }),
    ];
    const result = avgMasteryGainPerTopic(events);
    expect(result['photosynthesis']).toBeCloseTo(0.3);
  });

  it('computes zero gain when mastery unchanged', () => {
    const events = [
      makeEvent({ event_type: 'mastery_updated', seq: 1, payload: { mastery_score: 0.5 } }),
      makeEvent({ event_type: 'mastery_updated', seq: 2, payload: { mastery_score: 0.5 } }),
    ];
    expect(avgMasteryGainPerTopic(events)['photosynthesis']).toBeCloseTo(0);
  });

  it('computes negative gain when mastery decreases', () => {
    const events = [
      makeEvent({ event_type: 'mastery_updated', seq: 1, payload: { mastery_score: 0.7 } }),
      makeEvent({ event_type: 'mastery_updated', seq: 2, payload: { mastery_score: 0.5 } }),
    ];
    expect(avgMasteryGainPerTopic(events)['photosynthesis']).toBeCloseTo(-0.2);
  });

  it('handles multiple topics independently', () => {
    const events = [
      makeEvent({ event_type: 'mastery_updated', topic_id: 'photosynthesis', seq: 1, payload: { mastery_score: 0.3 } }),
      makeEvent({ event_type: 'mastery_updated', topic_id: 'photosynthesis', seq: 2, payload: { mastery_score: 0.7 } }),
      makeEvent({ event_type: 'mastery_updated', topic_id: 'parts_of_plant', seq: 3, payload: { mastery_score: 0.4 } }),
      makeEvent({ event_type: 'mastery_updated', topic_id: 'parts_of_plant', seq: 4, payload: { mastery_score: 0.9 } }),
    ];
    const result = avgMasteryGainPerTopic(events);
    expect(result['photosynthesis']).toBeCloseTo(0.4);
    expect(result['parts_of_plant']).toBeCloseTo(0.5);
  });
});

// ---- sessionsPerWeek ----------------------------------------

describe('sessionsPerWeek', () => {
  it('returns 0 for empty event list', () => {
    expect(sessionsPerWeek([])).toBe(0);
  });

  it('counts distinct active days in last 4 weeks / 4', () => {
    const events = [
      makeEvent({ timestamp: daysAgo(1) }),
      makeEvent({ timestamp: daysAgo(1) }), // same day — should count once
      makeEvent({ timestamp: daysAgo(8) }),
      makeEvent({ timestamp: daysAgo(15) }),
    ];
    // 3 distinct days / 4 weeks = 0.75
    expect(sessionsPerWeek(events)).toBeCloseTo(0.75);
  });

  it('ignores events older than 4 weeks', () => {
    const events = [
      makeEvent({ timestamp: daysAgo(1) }),
      makeEvent({ timestamp: daysAgo(30) }), // 30 days ago is outside 4-week window
    ];
    // Only 1 day in the window
    expect(sessionsPerWeek(events)).toBeCloseTo(0.25);
  });
});
