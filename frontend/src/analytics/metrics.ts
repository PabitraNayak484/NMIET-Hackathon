// ============================================================
// Analytics — pure metrics functions over the event log (MR-81)
// No DB calls — callers pass in the event arrays.
// All functions are side-effect free and fully unit-testable.
// ============================================================
import type { ProgressEvent } from '../types';

// ---- 1. Misconception Recurrence Rate (MR-81) ---------------

/**
 * Rate at which a misconception recurs after being first detected.
 * = (number of distinct sessions where misconception reappears) /
 *   (total sessions after first detection)
 *
 * Returns 0 if the misconception was never detected.
 */
export function misconceptionRecurrenceRate(
  events: ProgressEvent[],
  topicId: string,
  misconceptionId: string
): number {
  const relevant = events.filter(
    (e) => e.topic_id === topicId && e.event_type === 'misconception_detected'
  );

  // Group detections by "session" (day boundary as proxy)
  const sessionDays = relevant
    .filter((e) => (e.payload as Record<string, unknown>).misconception_id === misconceptionId)
    .map((e) => isoToDateKey(e.timestamp));

  const firstDay = sessionDays[0];
  if (!firstDay) return 0;

  // Sessions after first detection
  const afterFirst = sessionDays.filter((d) => d > firstDay);
  const distinctAfter = new Set(afterFirst).size;

  // Sessions total (after first)
  const allRelevantDays = relevant
    .map((e) => isoToDateKey(e.timestamp))
    .filter((d) => d >= firstDay);
  const totalSessions = new Set(allRelevantDays).size;

  if (totalSessions <= 1) return 0;
  return distinctAfter / (totalSessions - 1);
}

// ---- 2. Next-action Completion Rate (MR-81) -----------------

/**
 * Fraction of next_action_selected events that were followed by
 * at least one quiz_answered event in the same session.
 *
 * A "session" is defined as events within the same calendar day.
 */
export function nextActionCompletionRate(events: ProgressEvent[]): number {
  const byDay = groupByDay(events);
  let recommended = 0;
  let completed = 0;

  for (const dayEvents of Object.values(byDay)) {
    const suggestions = dayEvents.filter((e) => e.event_type === 'next_action_selected');
    const quizAnswers = dayEvents.filter((e) => e.event_type === 'quiz_answered');
    recommended += suggestions.length;
    if (suggestions.length > 0 && quizAnswers.length > 0) {
      completed += Math.min(suggestions.length, quizAnswers.length);
    }
  }

  if (recommended === 0) return 0;
  return completed / recommended;
}

// ---- 3. Average Mastery Gain Per Topic (MR-81) --------------

/**
 * For each topic_id, computes the net mastery change from the
 * first mastery_updated event to the last mastery_updated event.
 * Returns a map of topic_id => gain (can be negative).
 */
export function avgMasteryGainPerTopic(
  events: ProgressEvent[]
): Record<string, number> {
  const masteryEvents = events.filter((e) => e.event_type === 'mastery_updated');

  const byTopic: Record<string, ProgressEvent[]> = {};
  for (const e of masteryEvents) {
    if (!byTopic[e.topic_id]) byTopic[e.topic_id] = [];
    byTopic[e.topic_id].push(e);
  }

  const result: Record<string, number> = {};
  for (const [topicId, topicEvents] of Object.entries(byTopic)) {
    const sorted = [...topicEvents].sort((a, b) => a.seq - b.seq);
    const first = sorted[0].payload as Record<string, unknown>;
    const last = sorted[sorted.length - 1].payload as Record<string, unknown>;
    const firstScore = typeof first.mastery_score === 'number' ? first.mastery_score : 0;
    const lastScore = typeof last.mastery_score === 'number' ? last.mastery_score : 0;
    result[topicId] = parseFloat((lastScore - firstScore).toFixed(4));
  }

  return result;
}

// ---- 4. Sessions Per Week (MR-81) ---------------------------

/**
 * Average number of learning sessions per week over the last 4 weeks.
 * A "session" = a calendar day on which at least one progress event was recorded.
 */
export function sessionsPerWeek(events: ProgressEvent[]): number {
  if (events.length === 0) return 0;

  const now = Date.now();
  const fourWeeksAgo = now - 28 * 24 * 60 * 60 * 1000;

  const recentEvents = events.filter(
    (e) => new Date(e.timestamp).getTime() >= fourWeeksAgo
  );

  const activeDays = new Set(recentEvents.map((e) => isoToDateKey(e.timestamp)));
  return parseFloat((activeDays.size / 4).toFixed(2));
}

// ---- Helpers -------------------------------------------------

function isoToDateKey(iso: string): string {
  return iso.substring(0, 10);
}

function groupByDay(events: ProgressEvent[]): Record<string, ProgressEvent[]> {
  const result: Record<string, ProgressEvent[]> = {};
  for (const e of events) {
    const key = isoToDateKey(e.timestamp);
    if (!result[key]) result[key] = [];
    result[key].push(e);
  }
  return result;
}
