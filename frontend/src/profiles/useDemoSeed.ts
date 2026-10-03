// ============================================================
// useDemoSeed — Phase 6 demo profile seeder (browser-side)
// Inserts the "Priya" demo profile into IndexedDB.
// Safe to call multiple times — uses put() (upsert).
// ============================================================
import { useState, useCallback } from 'react';
import { db } from '../db/schema';
import type { ProfileRecord, LearnerState, ProgressEvent } from '../types';

const NOW = new Date().toISOString();

const DEMO_PROFILE: ProfileRecord = {
  profile_id: 'stu_demo_priya',
  nickname:   'Priya',
  avatar:     '🌻',
  class:      7,
  language:   'or',
  board:      'BSE-Odisha',
  created_at: NOW,
};

const DEMO_LEARNING_STATE: LearnerState = {
  student_id:     'stu_demo_priya',
  topic_id:       'photosynthesis',
  mastery_score:  0.3,
  confidence:     0.4,
  attempt_count:  1,
  correct_count:  0,
  misconceptions: [],
  last_activity:  NOW,
  next_action:    'explain',
  updatedAt:      NOW,
};

const DEMO_BASELINE_EVENT: ProgressEvent = {
  event_id:         'evt_demo_baseline_001',
  student_id:       'stu_demo_priya',
  topic_id:         'photosynthesis',
  event_type:       'baseline_check',
  payload:          { mastery_score: 0.3, source: 'demo_seed' },
  timestamp:        NOW,
  client_timestamp: NOW,
  seq:              1,
  sync_status:      'synced',
  device_id:        'demo_device',
};

export function useDemoSeed() {
  const [seeding, setSeeding] = useState(false);
  const [seeded,  setSeeded]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const seedDemo = useCallback(async () => {
    setSeeding(true);
    setError(null);
    try {
      // Idempotent upserts
      await db.profiles.put(DEMO_PROFILE);
      await db.learning_state.put(DEMO_LEARNING_STATE);
      await db.progress_events.put(DEMO_BASELINE_EVENT);
      await db.meta.put({ key: 'active_profile_id', value: 'stu_demo_priya' });
      await db.meta.put({ key: 'available_time_min', value: '10' });

      setSeeded(true);
      return DEMO_PROFILE;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      console.error('[useDemoSeed]', e);
      return null;
    } finally {
      setSeeding(false);
    }
  }, []);

  return { seedDemo, seeding, seeded, error };
}
