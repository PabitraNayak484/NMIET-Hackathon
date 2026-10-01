// ============================================================
// Planner — pure function, no I/O, fully unit-testable
// Rule table: evaluated top to bottom, first match wins.
// ============================================================
import type { LearnerState, AssessmentResult, NetworkStatus, PlanResult, Action, SelfDifficulty } from '../types';


export interface PlannerInput {
  learnerState:            LearnerState;
  assessmentResult:        AssessmentResult | null;
  networkStatus:           NetworkStatus;
  topicInPack:             boolean;          // false → teacher_escalation
  contentConfident:        boolean;          // false → teacher_escalation
  prerequisiteMastery:     Record<string, number>; // topic_id → mastery score
  availableTimeMin:        number;           // MR-13: minutes student has
  selfReportedDifficulty?: SelfDifficulty;  // MR-12: easy/okay/hard from UI tap
}


/**
 * Deterministic rule table. Returns the action and the rule that fired.
 * The reason string is the ACTUAL rule that fired — not generated text.
 */
export function selectNextAction(input: PlannerInput): PlanResult {
  const {
    learnerState: s,
    assessmentResult: ar,
    networkStatus: _networkStatus,
    topicInPack,
    contentConfident,
    prerequisiteMastery,
    availableTimeMin,
    selfReportedDifficulty,
  } = input;


  // ---- Rule 1: Out of pack or content confidence too low ----
  if (!topicInPack || !contentConfident) {
    return plan(1, 'teacher_escalation',
      'This is outside my verified lessons. I saved it for your teacher.');
  }

  // ---- Rule 2: Any prerequisite mastery < 0.4 ---------------
  const weakPrereq = Object.entries(prerequisiteMastery).find(([, m]) => m < 0.4);
  if (weakPrereq) {
    return plan(2, 'revise_prerequisite',
      `First let's revisit prerequisite: ${weakPrereq[0]}`, undefined, weakPrereq[0]);
  }

  // ---- Rule 3: No prior attempts on this topic --------------
  if (s.attempt_count === 0) {
    return plan(3, 'explain', "New topic — let's start with the idea.");
  }

  // ---- Rule 4: Latest assessment shows a misconception ------
  if (ar?.misconception_id && s.misconceptions.includes(ar.misconception_id)) {
    return plan(4, 'give_example',
      `Misconception detected: ${ar.misconception_id} — showing a targeted example.`,
      ar.misconception_id);
  }

  // ---- Rule 5: Same misconception 2+ times ------------------
  if (s.misconceptions.length > 0) {
    const repeated = s.misconceptions[0]; // most recent uncleared
    const repeatCount = countMisconductRepeats(s, repeated);
    if (repeatCount >= 3) {
      return plan(5, 'teacher_escalation',
        `Misconception ${repeated} repeated 3 times — escalating to teacher.`);
    }
    if (repeatCount >= 2) {
      return plan(5, 'explain',
        `Repeated misconception ${repeated} — trying a simpler explanation.`,
        repeated);
    }
  }

  // ---- Rule 6: Mastery < 0.5 --------------------------------
  if (s.mastery_score < 0.5) {
    return plan(6, 'practice', 'Mastery below 50% — more practice will help.');
  }

  // ---- Rule 7: 0.5 ≤ mastery < 0.8 -------------------------
  if (s.mastery_score < 0.8) {
    return plan(7, 'quiz', "Let's check what you know now.");
  }

  // ---- Rule 8: Mastery ≥ 0.8 but last review > 3 days ------
  if (s.mastery_score >= 0.8 && daysSince(s.last_activity) > 3) {
    return plan(8, 'review', 'Quick review to keep it fresh.');
  }

  // ---- Rule 9: Mastery ≥ 0.8 — move on ---------------------
  let base = plan(9, 'continue', "Great — ready for the next topic.");

  // ---- Modifier A: available time (MR-13) -------------------
  // Swap long actions for short ones when student has < 5 min.
  base = applyTimeModifier(base, availableTimeMin);

  // ---- Modifier B: self-reported difficulty (MR-12) ---------
  // 'hard' → downgrade quiz/practice to a new explanation.
  // 'easy' → skip explain and go straight to quiz.
  base = applySelfDifficultyModifier(base, selfReportedDifficulty);

  return base;
}

// Apply time modifier: swap explain/practice → quiz when short on time (MR-13)
export function applyTimeModifier(result: PlanResult, availableTimeMin: number): PlanResult {
  if (availableTimeMin < 5 && (result.action === 'explain' || result.action === 'practice')) {
    return {
      ...result,
      action: 'quiz',
      reason: result.reason + ' [time modifier: prefer quick quiz]',
    };
  }
  return result;
}

// Apply self-difficulty modifier (MR-12)
// 'hard' → re-explain if we were going to quiz/practice (student not ready)
// 'easy' → skip straight to quiz if we were going to explain again
export function applySelfDifficultyModifier(
  result: PlanResult,
  difficulty?: SelfDifficulty
): PlanResult {
  if (!difficulty || difficulty === 'okay') return result;
  if (difficulty === 'hard' && (result.action === 'quiz' || result.action === 'practice')) {
    return {
      ...result,
      action: 'explain',
      reason: result.reason + ' [difficulty modifier: student found it hard, re-explaining]',
    };
  }
  if (difficulty === 'easy' && result.action === 'explain') {
    return {
      ...result,
      action: 'quiz',
      reason: result.reason + ' [difficulty modifier: student found it easy, skipping to quiz]',
    };
  }
  return result;
}

// ---- Helpers ------------------------------------------------

function plan(
  ruleId: number,
  action: Action,
  reason: string,
  targetMisconception?: string,
  targetPrerequisite?: string
): PlanResult {
  return { action, reason, ruleId, targetMisconception, targetPrerequisite };
}

function countMisconductRepeats(state: LearnerState, misconceptionId: string): number {
  // Simple heuristic: each misconception in the list counts as a repeat
  return state.misconceptions.filter(m => m === misconceptionId).length + 1;
}

function daysSince(isoTimestamp: string): number {
  const ms = Date.now() - new Date(isoTimestamp).getTime();
  return ms / (1000 * 60 * 60 * 24);
}
