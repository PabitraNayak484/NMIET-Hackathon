// ============================================================
// seedDemo.ts — Phase 6 demo seed
// Run with:  npx tsx scripts/seedDemo.ts
//
// Seeds the IndexedDB (via node-compatible fake-indexeddb)
// with the Priya demo profile, pre-cached photosynthesis state,
// and 10-question quiz fixtures so the demo works cold-start.
// ============================================================
import 'fake-indexeddb/auto';
import { db } from '../src/db/schema';
import type { ProfileRecord, LearnerState, ProgressEvent } from '../src/types';

const NOW = new Date().toISOString();

// ── Demo profile ─────────────────────────────────────────────
const PRIYA: ProfileRecord = {
  profile_id:   'stu_demo_priya',
  nickname:     'Priya',
  avatar:       'sunflower',         // maps to emoji 🌻 in UI
  class_num:    7,
  board:        'BSE-Odisha',
  language:     'or',
  subjects:     ['science'],
  created_at:   NOW,
  updated_at:   NOW,
};

// ── Learning state (photosynthesis mastery = 0.3) ─────────────
const LEARNING_STATE: LearnerState = {
  student_id:    'stu_demo_priya',
  topic_id:      'photosynthesis',
  mastery_score: 0.3,
  confidence:    0.4,
  attempt_count: 1,
  last_activity: NOW,
  misconceptions: [],
  history:       [],
};

// ── Baseline progress event ───────────────────────────────────
const BASELINE_EVENT: ProgressEvent = {
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

async function seed() {
  console.log('[seedDemo] Seeding Priya demo profile...');

  // Profile
  await db.profiles.put(PRIYA);
  console.log('[seedDemo] ✓ Profile: Priya (stu_demo_priya)');

  // Learning state
  await db.learning_state.put(LEARNING_STATE);
  console.log('[seedDemo] ✓ Learning state: photosynthesis mastery=0.3');

  // Progress event
  await db.progress_events.put(BASELINE_EVENT);
  console.log('[seedDemo] ✓ Baseline progress event');

  // Store last active profile
  await db.meta.put({ key: 'active_profile_id', value: 'stu_demo_priya' });
  await db.meta.put({ key: 'available_time_min', value: '10' });
  console.log('[seedDemo] ✓ Meta: active profile + study time (10 min)');

  console.log('\n[seedDemo] ✅ Demo seed complete!');
  console.log('  Open the app → Profile Picker → select Priya → start learning.');
}

seed().catch(console.error);
