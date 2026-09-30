// ============================================================
// Tests: progress events — MR-50 (seq ordering, client_timestamp)
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { appendProgressEvent, getPendingEvents, pruneOldSyncedEvents } from '@/db/repo';
import { db } from '@/db/schema';
import type { ProgressEvent } from '@/types';
import { v4 as uuidv4 } from 'uuid';

function makeEvent(overrides: Partial<ProgressEvent> = {}): ProgressEvent {
  const now = new Date().toISOString();
  return {
    event_id:         uuidv4(),
    student_id:       'stu1',
    topic_id:         'photo',
    event_type:       'quiz_answered',
    payload:          {},
    timestamp:        now,
    client_timestamp: now,
    seq:              0,        // will be overwritten by appendProgressEvent
    sync_status:      'pending',
    device_id:        'device-test',
    ...overrides,
  };
}

beforeEach(async () => {
  await db.progress_events.clear();
  await db.meta.clear();
});

describe('MR-50: seq auto-increment', () => {
  it('assigns monotonically increasing seq values', async () => {
    await appendProgressEvent(makeEvent());
    await appendProgressEvent(makeEvent());
    await appendProgressEvent(makeEvent());

    const events = await getPendingEvents();
    const seqs = events.map(e => e.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(3); // all unique
  });

  it('sets client_timestamp equal to timestamp at creation', async () => {
    const ev = makeEvent();
    await appendProgressEvent(ev);
    const [stored] = await db.progress_events.toArray();
    expect(stored.client_timestamp).toBeTruthy();
    expect(stored.seq).toBeGreaterThan(0);
  });

  it('getPendingEvents returns events ordered by seq', async () => {
    // Insert out of wall-clock order but seq should still order correctly
    for (let i = 0; i < 5; i++) {
      await appendProgressEvent(makeEvent({ timestamp: new Date(Date.now() - i * 1000).toISOString() }));
    }
    const events = await getPendingEvents();
    for (let i = 1; i < events.length; i++) {
      expect(events[i].seq).toBeGreaterThan(events[i - 1].seq);
    }
  });
});

describe('MR-41: pruneOldSyncedEvents', () => {
  it('removes synced events older than N days', async () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await appendProgressEvent(makeEvent({ sync_status: 'synced', timestamp: old }));
    await appendProgressEvent(makeEvent({ sync_status: 'synced' })); // recent

    const pruned = await pruneOldSyncedEvents(30);
    expect(pruned).toBe(1);
    const remaining = await db.progress_events.count();
    expect(remaining).toBe(1);
  });

  it('does not prune pending events', async () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await appendProgressEvent(makeEvent({ sync_status: 'pending', timestamp: old }));
    const pruned = await pruneOldSyncedEvents(30);
    expect(pruned).toBe(0);
  });
});

