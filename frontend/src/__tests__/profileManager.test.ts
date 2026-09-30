// ============================================================
// Tests: profileManager — MR-01, MR-02, MR-04
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  createProfile, getProfiles, switchProfile,
  clearProfileData, deleteProfile, clearAllProfilesData,
  getActiveProfile, MAX_PROFILES,
} from '@/profiles/profileManager';
import { saveLearningState, getLearningState } from '@/db/repo';
import { db } from '@/db/schema';

beforeEach(async () => {
  await db.profiles.clear();
  await db.learning_state.clear();
  await db.progress_events.clear();
  await db.quiz_seen.clear();
  await db.resume_state.clear();
  await db.meta.clear();
});

describe('MR-01: Multi-profile creation', () => {
  it('creates a profile and sets it as active', async () => {
    const p = await createProfile({ nickname: 'Priya', avatar: '🌻', class: 7, language: 'or', board: 'BSE' });
    expect(p.nickname).toBe('Priya');
    const active = await getActiveProfile();
    expect(active?.profile_id).toBe(p.profile_id);
  });

  it('allows up to MAX_PROFILES profiles', async () => {
    for (let i = 0; i < MAX_PROFILES; i++) {
      await createProfile({ nickname: `Student${i}`, avatar: '📚', class: 7, language: 'en', board: 'CBSE' });
    }
    const list = await getProfiles();
    expect(list.length).toBe(MAX_PROFILES);
  });

  it('throws when MAX_PROFILES is exceeded', async () => {
    for (let i = 0; i < MAX_PROFILES; i++) {
      await createProfile({ nickname: `S${i}`, avatar: '📚', class: 7, language: 'en', board: 'CBSE' });
    }
    await expect(
      createProfile({ nickname: 'Extra', avatar: '📚', class: 7, language: 'en', board: 'CBSE' })
    ).rejects.toThrow(/Cannot create more than/);
  });
});

describe('MR-02: Profile switch (2-tap)', () => {
  it('switches active profile without affecting other profiles', async () => {
    const a = await createProfile({ nickname: 'A', avatar: '🌻', class: 7, language: 'en', board: 'CBSE' });
    const b = await createProfile({ nickname: 'B', avatar: '🌙', class: 8, language: 'hi', board: 'CBSE' });
    await switchProfile(a.profile_id);
    const active = await getActiveProfile();
    expect(active?.profile_id).toBe(a.profile_id);
    await switchProfile(b.profile_id);
    const active2 = await getActiveProfile();
    expect(active2?.profile_id).toBe(b.profile_id);
  });
});

describe('MR-04: Clear data per profile — other profiles untouched', () => {
  it('clearing profile A does not affect profile B data', async () => {
    const a = await createProfile({ nickname: 'A', avatar: '🌻', class: 7, language: 'or', board: 'BSE' });
    const b = await createProfile({ nickname: 'B', avatar: '🌙', class: 9, language: 'en', board: 'CBSE' });

    // Write learning state for both
    await saveLearningState({
      student_id: a.profile_id, topic_id: 'photo', mastery_score: 0.7,
      confidence: 0.8, attempt_count: 5, correct_count: 4,
      misconceptions: [], last_activity: new Date().toISOString(),
      next_action: null, updatedAt: new Date().toISOString(),
    });
    await saveLearningState({
      student_id: b.profile_id, topic_id: 'photo', mastery_score: 0.5,
      confidence: 0.6, attempt_count: 3, correct_count: 2,
      misconceptions: [], last_activity: new Date().toISOString(),
      next_action: null, updatedAt: new Date().toISOString(),
    });

    // Clear A's data
    await clearProfileData(a.profile_id);

    // A's mastery should be gone (will re-init at 0.3)
    const stateA = await getLearningState(a.profile_id, 'photo');
    expect(stateA.mastery_score).toBe(0.3); // re-initialised to default

    // B's mastery should be untouched
    const stateB = await getLearningState(b.profile_id, 'photo');
    expect(stateB.mastery_score).toBe(0.5);
  });

  it('deleteProfile removes profile and auto-switches active to remaining', async () => {
    const a = await createProfile({ nickname: 'A', avatar: '🌻', class: 7, language: 'en', board: 'CBSE' });
    const b = await createProfile({ nickname: 'B', avatar: '🌙', class: 8, language: 'en', board: 'CBSE' });
    await switchProfile(a.profile_id);
    await deleteProfile(a.profile_id);

    const remaining = await getProfiles();
    expect(remaining.map(p => p.profile_id)).not.toContain(a.profile_id);
    // Active should now be B
    const active = await getActiveProfile();
    expect(active?.profile_id).toBe(b.profile_id);
  });
});

