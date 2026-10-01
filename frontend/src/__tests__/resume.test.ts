// ============================================================
// Tests: resume state — MR-14 (mid-quiz restore after kill)
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  saveResumeState, getResumeState, clearResumeState,
} from '@/db/repo';
import { db } from '@/db/schema';
import type { ResumeState } from '@/types';

const PROFILE_ID = 'resume-test-profile';
const TOPIC_ID   = 'photosynthesis';

beforeEach(async () => {
  await db.resume_state.clear();
});

describe('MR-14: Resume interrupted quiz', () => {
  it('saves and retrieves resume state with correct question index', async () => {
    const state: ResumeState = {
      profile_id:       PROFILE_ID,
      topic_id:         TOPIC_ID,
      step:             'quiz',
      question_index:   2,
      answers_so_far:   [
        { question_id: 'q1', choice_id: 'a' },
        { question_id: 'q2', choice_id: 'b' },
      ],
      quiz_question_ids: ['q1', 'q2', 'q3'],
      timestamp:        new Date().toISOString(),
    };

    await saveResumeState(state);
    const retrieved = await getResumeState(PROFILE_ID, TOPIC_ID);

    expect(retrieved).toBeDefined();
    expect(retrieved!.question_index).toBe(2);
    expect(retrieved!.answers_so_far).toHaveLength(2);
    expect(retrieved!.quiz_question_ids).toEqual(['q1', 'q2', 'q3']);
  });

  it('returns undefined when no resume state exists', async () => {
    const r = await getResumeState('no-profile', 'no-topic');
    expect(r).toBeUndefined();
  });

  it('clears resume state on topic completion', async () => {
    const state: ResumeState = {
      profile_id:       PROFILE_ID,
      topic_id:         TOPIC_ID,
      step:             'quiz',
      question_index:   0,
      answers_so_far:   [],
      quiz_question_ids: ['q1'],
      timestamp:        new Date().toISOString(),
    };
    await saveResumeState(state);
    await clearResumeState(PROFILE_ID, TOPIC_ID);
    const r = await getResumeState(PROFILE_ID, TOPIC_ID);
    expect(r).toBeUndefined();
  });

  it('overwriting resume state preserves the latest answers_so_far', async () => {
    const v1: ResumeState = {
      profile_id: PROFILE_ID, topic_id: TOPIC_ID,
      step: 'quiz', question_index: 0,
      answers_so_far: [],
      quiz_question_ids: ['q1', 'q2'],
      timestamp: new Date().toISOString(),
    };
    const v2: ResumeState = {
      ...v1,
      question_index: 1,
      answers_so_far: [{ question_id: 'q1', choice_id: 'a' }],
    };
    await saveResumeState(v1);
    await saveResumeState(v2);
    const r = await getResumeState(PROFILE_ID, TOPIC_ID);
    expect(r!.question_index).toBe(1);
    expect(r!.answers_so_far).toHaveLength(1);
  });
});

