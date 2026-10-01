// ============================================================
// Mastery Engine — pure deterministic functions
// All functions are side-effect free and fully unit-testable.
// ============================================================
import type { SelfDifficulty } from '../types';


export type DifficultyBand = 'easy' | 'medium' | 'hard';

const DIFFICULTY_WEIGHT: Record<DifficultyBand, number> = {
  easy:   0.8,
  medium: 1.0,
  hard:   1.2,
};

const LEARNING_RATE       = 0.25;
const MISCONCEPTION_PENALTY = 0.05;
const INITIAL_MASTERY     = 0.3;
const MAX_CONFIDENCE_WINDOW = 5;

/**
 * Core mastery update formula (exponential weighted moving average).
 * result: 1.0 correct | 0.5 partial | 0.0 incorrect
 */
export function computeMastery(
  current: number,
  result: 1.0 | 0.5 | 0.0,
  difficulty: DifficultyBand
): number {
  const alpha   = LEARNING_RATE * DIFFICULTY_WEIGHT[difficulty];
  const updated = current + alpha * (result - current);
  return clamp(updated, 0, 1);
}

/**
 * Apply extra penalty when a new misconception is detected.
 */
export function applyMisconductPenalty(mastery: number): number {
  return clamp(mastery - MISCONCEPTION_PENALTY, 0, 1);
}

/**
 * Rolling confidence: average correctness of last N attempts.
 * history: array of booleans (true = correct), newest last.
 */
export function updateConfidence(history: boolean[]): number {
  const window = history.slice(-MAX_CONFIDENCE_WINDOW);
  if (window.length === 0) return 0;
  return window.filter(Boolean).length / window.length;
}

/**
 * Blends objective confidence with self-reported difficulty (MR-12).
 * selfReport maps  easy → +0.1, okay → 0, hard → -0.15 adjustment.
 * Clamped to [0, 1].
 */
export function updateConfidenceWithSelfReport(
  history: boolean[],
  selfReport?: SelfDifficulty
): number {
  const base = updateConfidence(history);
  const adj: Record<SelfDifficulty, number> = { easy: 0.1, okay: 0, hard: -0.15 };
  if (!selfReport) return base;
  return clamp(base + adj[selfReport], 0, 1);
}

/**
 * Returns true if a misconception should be considered cleared:
 * two consecutive correct answers targeting the same misconception.
 */
export function isMisconductCleared(
  recentResults: Array<{ correct: boolean; misconception_id: string | null }>,
  misconceptionId: string
): boolean {
  const relevant = recentResults.filter(r => r.misconception_id === misconceptionId || r.correct);
  if (relevant.length < 2) return false;
  const last2 = relevant.slice(-2);
  return last2.every(r => r.correct);
}

/**
 * Determine which concepts/topics are "weak" based on state.
 */
export function getWeakAreas(
  mastery_score: number,
  misconceptions: string[]
): { isWeak: boolean; reason: string } {
  if (misconceptions.length > 0) {
    return { isWeak: true, reason: `active misconceptions: ${misconceptions.join(', ')}` };
  }
  if (mastery_score < 0.5) {
    return { isWeak: true, reason: `mastery ${(mastery_score * 100).toFixed(0)}% < 50%` };
  }
  return { isWeak: false, reason: '' };
}

export function initialMastery(): number {
  return INITIAL_MASTERY;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Classify mastery into a label for UI display */
export function masteryLabel(score: number): 'beginner' | 'learning' | 'confident' | 'mastered' {
  if (score < 0.35) return 'beginner';
  if (score < 0.5)  return 'learning';
  if (score < 0.8)  return 'confident';
  return 'mastered';
}

/** Map mastery to a difficulty band for quiz selection */
export function masteryToDifficultyBand(score: number): DifficultyBand {
  if (score < 0.45) return 'easy';
  if (score < 0.75) return 'medium';
  return 'hard';
}
