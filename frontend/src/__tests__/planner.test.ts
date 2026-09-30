// ============================================================
// Tests: planner — all 9 rules + MR-12 + MR-13 modifiers
// Pure functions, no DB, no mocks.
// ============================================================
import { describe, it, expect } from 'vitest';
import { selectNextAction, applyTimeModifier, applySelfDifficultyModifier, type PlannerInput } from '@/agent/planner';
import type { LearnerState } from '@/types';

// ---- Fixtures -----------------------------------------------

function makeState(overrides: Partial<LearnerState> = {}): LearnerState {
  return {
    student_id:    's1',
    topic_id:      'photosynthesis',
    mastery_score:  0.5,
    confidence:     0.5,
    attempt_count:  3,
    correct_count:  2,
    misconceptions: [],
    last_activity:  new Date().toISOString(),
    next_action:    null,
    updatedAt:      new Date().toISOString(),
    ...overrides,
  };
}

function makeInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    learnerState:        makeState(),
    assessmentResult:    null,
    networkStatus:       'ONLINE',
    topicInPack:         true,
    contentConfident:    true,
    prerequisiteMastery: {},
    availableTimeMin:    20,
    ...overrides,
  };
}

// ---- Rule tests ---------------------------------------------

describe('Planner rules', () => {
  it('Rule 1: out-of-pack → teacher_escalation', () => {
    const r = selectNextAction(makeInput({ topicInPack: false }));
    expect(r.action).toBe('teacher_escalation');
    expect(r.ruleId).toBe(1);
  });

  it('Rule 1: low confidence → teacher_escalation', () => {
    const r = selectNextAction(makeInput({ contentConfident: false }));
    expect(r.action).toBe('teacher_escalation');
    expect(r.ruleId).toBe(1);
  });

  it('Rule 2: weak prerequisite → revise_prerequisite', () => {
    const r = selectNextAction(makeInput({ prerequisiteMastery: { parts_of_plant: 0.2 } }));
    expect(r.action).toBe('revise_prerequisite');
    expect(r.ruleId).toBe(2);
    expect(r.targetPrerequisite).toBe('parts_of_plant');
  });

  it('Rule 3: no prior attempts → explain', () => {
    const r = selectNextAction(makeInput({ learnerState: makeState({ attempt_count: 0 }) }));
    expect(r.action).toBe('explain');
    expect(r.ruleId).toBe(3);
  });

  it('Rule 4: misconception in latest assessment → give_example', () => {
    const r = selectNextAction(makeInput({
      learnerState: makeState({ misconceptions: ['mc_soil'] }),
      assessmentResult: {
        question_id: 'q1', correct: false, confidence: 0.9,
        reasoning_category: 'option_match', misconception_id: 'mc_soil',
      },
    }));
    expect(r.action).toBe('give_example');
    expect(r.ruleId).toBe(4);
  });

  it('Rule 5: same misconception 3 times → teacher_escalation', () => {
    const r = selectNextAction(makeInput({
      learnerState: makeState({
        misconceptions: ['mc_soil', 'mc_soil', 'mc_soil'],
      }),
    }));
    expect(r.action).toBe('teacher_escalation');
    expect(r.ruleId).toBe(5);
  });

  it('Rule 6: mastery < 0.5 → practice', () => {
    const r = selectNextAction(makeInput({ learnerState: makeState({ mastery_score: 0.4 }) }));
    expect(r.action).toBe('practice');
    expect(r.ruleId).toBe(6);
  });

  it('Rule 7: 0.5 ≤ mastery < 0.8 → quiz', () => {
    const r = selectNextAction(makeInput({ learnerState: makeState({ mastery_score: 0.65 }) }));
    expect(r.action).toBe('quiz');
    expect(r.ruleId).toBe(7);
  });

  it('Rule 8: mastery ≥ 0.8, activity > 3 days ago → review', () => {
    const old = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const r = selectNextAction(makeInput({
      learnerState: makeState({ mastery_score: 0.85, last_activity: old }),
    }));
    expect(r.action).toBe('review');
    expect(r.ruleId).toBe(8);
  });

  it('Rule 9: mastery ≥ 0.8, recent activity → continue', () => {
    const r = selectNextAction(makeInput({
      learnerState: makeState({ mastery_score: 0.85 }),
    }));
    expect(r.action).toBe('continue');
    expect(r.ruleId).toBe(9);
  });
});

// ---- MR-13: Available time modifier -------------------------

describe('MR-13: Available time modifier', () => {
  it('swaps explain → quiz when availableTimeMin < 5', () => {
    const base = { action: 'explain' as const, reason: 'new topic', ruleId: 3 };
    const result = applyTimeModifier(base, 4);
    expect(result.action).toBe('quiz');
    expect(result.reason).toContain('time modifier');
  });

  it('does not swap quiz or review when time is short', () => {
    const quiz = { action: 'quiz' as const, reason: 'test', ruleId: 7 };
    expect(applyTimeModifier(quiz, 4).action).toBe('quiz');
  });

  it('does not modify when time ≥ 5', () => {
    const base = { action: 'explain' as const, reason: 'test', ruleId: 3 };
    expect(applyTimeModifier(base, 10).action).toBe('explain');
  });
});

// ---- MR-12: Self-reported difficulty modifier ---------------

describe('MR-12: Self-reported difficulty modifier', () => {
  it("'hard' downgrades quiz → explain", () => {
    const base = { action: 'quiz' as const, reason: 'test', ruleId: 7 };
    expect(applySelfDifficultyModifier(base, 'hard').action).toBe('explain');
  });

  it("'hard' downgrades practice → explain", () => {
    const base = { action: 'practice' as const, reason: 'test', ruleId: 6 };
    expect(applySelfDifficultyModifier(base, 'hard').action).toBe('explain');
  });

  it("'easy' upgrades explain → quiz", () => {
    const base = { action: 'explain' as const, reason: 'test', ruleId: 3 };
    expect(applySelfDifficultyModifier(base, 'easy').action).toBe('quiz');
  });

  it("'okay' changes nothing", () => {
    const base = { action: 'quiz' as const, reason: 'test', ruleId: 7 };
    expect(applySelfDifficultyModifier(base, 'okay').action).toBe('quiz');
  });

  it('undefined self-report changes nothing', () => {
    const base = { action: 'practice' as const, reason: 'test', ruleId: 6 };
    expect(applySelfDifficultyModifier(base, undefined).action).toBe('practice');
  });
});

