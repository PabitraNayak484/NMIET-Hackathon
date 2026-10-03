// ============================================================
// Tests: mastery — formula + MR-12 self-difficulty confidence
// Pure functions, no DB.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  computeMastery, applyMisconductPenalty,
  updateConfidence, updateConfidenceWithSelfReport,
  masteryLabel, masteryToDifficultyBand,
} from '@/agent/mastery';

describe('computeMastery', () => {
  it('increases mastery on correct answer', () => {
    const updated = computeMastery(0.5, 1.0, 'medium');
    expect(updated).toBeGreaterThan(0.5);
  });

  it('decreases mastery on wrong answer', () => {
    const updated = computeMastery(0.5, 0.0, 'medium');
    expect(updated).toBeLessThan(0.5);
  });

  it('partial credit moves mastery less than full credit', () => {
    const full    = computeMastery(0.3, 1.0, 'medium');
    const partial = computeMastery(0.3, 0.5, 'medium');
    expect(partial).toBeGreaterThan(0.3);
    expect(partial).toBeLessThan(full);
  });

  it('clamps to [0, 1]', () => {
    expect(computeMastery(0.99, 1.0, 'hard')).toBeLessThanOrEqual(1);
    expect(computeMastery(0.01, 0.0, 'hard')).toBeGreaterThanOrEqual(0);
  });

  it('hard difficulty moves mastery more than easy', () => {
    const hard = computeMastery(0.5, 1.0, 'hard');
    const easy = computeMastery(0.5, 1.0, 'easy');
    expect(hard).toBeGreaterThan(easy);
  });
});

describe('applyMisconductPenalty', () => {
  it('reduces mastery by 0.05', () => {
    expect(applyMisconductPenalty(0.5)).toBeCloseTo(0.45);
  });

  it('does not go below 0', () => {
    expect(applyMisconductPenalty(0.02)).toBeGreaterThanOrEqual(0);
  });
});

describe('updateConfidence', () => {
  it('returns 0 for empty history', () => {
    expect(updateConfidence([])).toBe(0);
  });

  it('returns 1.0 for all correct', () => {
    expect(updateConfidence([true, true, true, true, true])).toBe(1.0);
  });

  it('returns 0.0 for all wrong', () => {
    expect(updateConfidence([false, false, false, false, false])).toBe(0.0);
  });

  it('uses only last 5 results', () => {
    // 5 wrong then 5 correct → window is all correct → 1.0
    const history = [false, false, false, false, false, true, true, true, true, true];
    expect(updateConfidence(history)).toBe(1.0);
  });
});

describe('MR-12: updateConfidenceWithSelfReport', () => {
  const history = [true, true, false, true, true]; // base = 0.8

  it("'easy' increases confidence by 0.1", () => {
    const result = updateConfidenceWithSelfReport(history, 'easy');
    expect(result).toBeCloseTo(0.9);
  });

  it("'okay' makes no adjustment", () => {
    const result = updateConfidenceWithSelfReport(history, 'okay');
    expect(result).toBeCloseTo(0.8);
  });

  it("'hard' decreases confidence by 0.15", () => {
    const result = updateConfidenceWithSelfReport(history, 'hard');
    expect(result).toBeCloseTo(0.65);
  });

  it('clamps to [0, 1] on high or low inputs', () => {
    expect(updateConfidenceWithSelfReport([true, true, true, true, true], 'easy')).toBeLessThanOrEqual(1);
    expect(updateConfidenceWithSelfReport([false, false, false, false, false], 'hard')).toBeGreaterThanOrEqual(0);
  });

  it('no self-report has same result as updateConfidence', () => {
    const base = updateConfidence(history);
    expect(updateConfidenceWithSelfReport(history, undefined)).toBe(base);
  });
});

describe('masteryLabel and masteryToDifficultyBand', () => {
  it('maps scores to correct labels', () => {
    expect(masteryLabel(0.2)).toBe('beginner');
    expect(masteryLabel(0.45)).toBe('learning');
    expect(masteryLabel(0.65)).toBe('confident');
    expect(masteryLabel(0.9)).toBe('mastered');
  });

  it('maps scores to correct difficulty bands', () => {
    expect(masteryToDifficultyBand(0.2)).toBe('easy');
    expect(masteryToDifficultyBand(0.6)).toBe('medium');
    expect(masteryToDifficultyBand(0.9)).toBe('hard');
  });
});

