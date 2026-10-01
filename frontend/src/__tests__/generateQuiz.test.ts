// ============================================================
// Tests: generateQuiz — shuffle (MR-20) + no-repeat (MR-21)
// Uses fake-indexeddb to keep tests fully offline.
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db/schema';
import { generateQuiz } from '@/agent/tools/generateQuiz';
import type { QuizBankRecord } from '@/db/schema';

const TOPIC_ID = 'photosynthesis';
const PROFILE_ID = 'test-profile-001';

// Build 10 test questions (3 easy, 4 medium, 3 hard)
function makeQuestions(): QuizBankRecord[] {
  return Array.from({ length: 10 }, (_, i) => ({
    question_id: `q${i + 1}`,
    topic_id:    TOPIC_ID,
    pack_id:     'test-pack',
    difficulty:  i < 3 ? 'easy' : i < 7 ? 'medium' : 'hard',
    type:        'mcq' as const,
    concept_id:  'c1',
    stem:        { en: `Question ${i + 1}` },
    options:     [
      { id: 'a', text: { en: 'Option A' }, correct: true },
      { id: 'b', text: { en: 'Option B' }, misconception_id: 'mc1' },
      { id: 'c', text: { en: 'Option C' }, misconception_id: 'mc2' },
    ],
  }));
}

beforeEach(async () => {
  await db.quiz_bank.clear();
  await db.quiz_seen.clear();
  await db.quiz_bank.bulkAdd(makeQuestions());
});

// ---- MR-20: Option shuffle ---------------------------------

describe('MR-20: Option shuffle', () => {
  it('option IDs are unchanged after shuffle (scoring unaffected)', async () => {
    const result = await generateQuiz(TOPIC_ID, 'en', 0.3, PROFILE_ID, 3);
    expect(result.ok).toBe(true);
    for (const q of result.data!) {
      const ids = q.options.map(o => o.id).sort();
      expect(ids).toEqual(['a', 'b', 'c']);
    }
  });

  it('option order differs across two calls (probabilistic, 99.9% pass rate with 3+ options)', async () => {
    const orders: string[][] = [];
    for (let i = 0; i < 20; i++) {
      const r = await generateQuiz(TOPIC_ID, 'en', 0.3, PROFILE_ID, 1);
      orders.push(r.data![0].options.map(o => o.id));
    }
    // At least two different orderings must exist
    const unique = new Set(orders.map(o => o.join('')));
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ---- MR-21: No-repeat until bank exhausted -----------------

describe('MR-21: No question repeats before bank exhausted', () => {
  it('does not repeat a question before the whole easy band is used', async () => {
    // Use a unique profile per test so seen state doesn't cross tests
    const pid = `test-profile-${Date.now()}-A`;
    const seen = new Set<string>();

    // Call 3 times (3 easy questions in bank) — each should return a different question
    for (let i = 0; i < 3; i++) {
      const r = await generateQuiz(TOPIC_ID, 'en', 0.2, pid, 1);
      expect(r.ok).toBe(true);
      seen.add(r.data![0].question_id);
    }
    // All 3 easy questions must have been returned
    expect(seen.size).toBe(3);
  });

  it('resets seen list and cycles again when easy band is exhausted', async () => {
    // Easy band has exactly 3 questions in our fixture
    const pid = `test-profile-${Date.now()}-B`;
    const seenFirstCycle = new Set<string>();

    // Draw all 3 easy questions
    for (let i = 0; i < 3; i++) {
      const r = await generateQuiz(TOPIC_ID, 'en', 0.2, pid, 1);
      expect(r.ok).toBe(true);
      seenFirstCycle.add(r.data![0].question_id);
    }
    expect(seenFirstCycle.size).toBe(3);

    // On the 4th call the easy band is exhausted → resets, still returns a question
    const r = await generateQuiz(TOPIC_ID, 'en', 0.2, pid, 1);
    expect(r.ok).toBe(true);
  });
});


// ---- MR-22: minimum bank size validation -------------------

describe('MR-22: Returns error when bank is empty', () => {
  it('returns ok:false when no questions exist for topic', async () => {
    const r = await generateQuiz('nonexistent-topic', 'en', 0.5, PROFILE_ID, 3);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/No quiz questions/);
  });
});

