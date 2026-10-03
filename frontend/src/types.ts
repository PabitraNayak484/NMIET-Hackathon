// ============================================================
// SATHI — Shared Types
// Single source of truth for all data shapes used across agent,
// tools, DB, UI and sync layers.
// ============================================================

// ---- Language & I18n ----------------------------------------

export type LangCode = 'en' | 'hi' | 'or';

export type MultiLang = { en: string; hi?: string; or?: string; [k: string]: string | undefined };

// ---- Content Pack -------------------------------------------

export interface PackMeta {
  class: number;
  board: string;
  subject: string;
  source: string;
}

export interface ConceptContent {
  concept_id: string;
  content: MultiLang;
  examples: Record<LangCode, string[]>;
}

export interface Misconception {
  id: string;
  description: MultiLang;
  remediation_example: MultiLang;
}

export interface QuizOption {
  id: string;
  text: MultiLang;
  correct?: boolean;
  misconception_id?: string | null;
}

export interface QuizQuestion {
  question_id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'mcq' | 'true_false' | 'short_answer';
  concept_id: string;
  stem: MultiLang;
  options: QuizOption[];
}

export interface Topic {
  topic_id: string;
  chapter: string;
  difficulty: number;
  prerequisites: string[];
  aliases: Record<LangCode, string[]>;
  concepts: ConceptContent[];
  misconceptions: Misconception[];
  quiz: QuizQuestion[];
}

export interface GlossaryEntry {
  term_id: string;
  term: MultiLang;
  gloss: MultiLang;
  protected: boolean;
}

export interface ContentPack {
  pack_id: string;
  version: string;
  meta: PackMeta;
  topics: Topic[];
  glossary: GlossaryEntry[];
}

// ---- Language Pack ------------------------------------------

export interface LanguagePack {
  language_code: LangCode;
  display_name: string;
  ui_translations: Record<string, string>;
  feedback_templates: {
    correct: string;
    incorrect_with_misconception: string;
    incorrect_no_misconception: string;
    outside_pack: string;
    teacher_escalation: string;
    prerequisite_needed: string;
  };
  quiz_templates: {
    instruction: string;
    question_n_of_m: string;
    submit_answer: string;
  };
  example_templates: { everyday: string[] };
  voice_configuration: { tts: string; stt: string; available: boolean };
}

// ---- Student Profile ----------------------------------------

export interface StudentPreferences {
  examples: boolean;   // prefers more examples
  shortText: boolean;  // prefers shorter explanations
}

export interface StudentProfile {
  id: string;               // anonymous UUIDv4
  class: number;            // 1-12
  board: string;
  language: LangCode;
  subjects: string[];
  preferences: StudentPreferences;
  createdAt: string;        // ISO timestamp
}

// ---- Multi-profile record (MR-01) ---------------------------
// Up to 5 profiles can share one device.
export interface ProfileRecord {
  profile_id: string;       // UUIDv4
  nickname: string;         // student-chosen display name
  avatar: string;           // single emoji, e.g. "🌻"
  class: number;
  language: LangCode;
  board: string;
  pin_hash?: string;        // salted SHA-256 hex, optional (MR-03 P2)
  pin_salt?: string;
  created_at: string;       // ISO timestamp
}

// ---- Resume state (MR-14) -----------------------------------
// Persists mid-quiz position so app close/reload can restore it.
export interface ResumeState {
  profile_id: string;
  topic_id: string;
  step: 'quiz' | 'explanation';  // which step was interrupted
  question_index: number;        // which question in the quiz array
  answers_so_far: Array<{ question_id: string; choice_id: string }>;
  quiz_question_ids: string[];   // ordered IDs of the quiz in progress
  timestamp: string;             // ISO, for stale-state detection
}

// ---- Quiz-seen record (MR-21) --------------------------------
// Tracks which questions a profile has already seen per topic.
export interface QuizSeenRecord {
  id: string;                    // `${profile_id}::${topic_id}::${question_id}`
  profile_id: string;
  topic_id: string;
  question_id: string;
  last_seen: string;             // ISO timestamp
}

// ---- Self-reported difficulty (MR-12) -----------------------
export type SelfDifficulty = 'easy' | 'okay' | 'hard';


// ---- Learner State ------------------------------------------

export interface LearnerState {
  student_id: string;
  topic_id: string;
  mastery_score: number;    // 0.0 – 1.0
  confidence: number;       // rolling avg of last 5 (0-1)
  attempt_count: number;
  correct_count: number;
  misconceptions: string[]; // active misconception_ids
  last_activity: string;    // ISO timestamp
  next_action: Action | null;
  updatedAt: string;
}

// ---- Planner ------------------------------------------------

export type Action =
  | 'explain'
  | 'give_example'
  | 'revise_prerequisite'
  | 'practice'
  | 'quiz'
  | 'review'
  | 'continue'
  | 'teacher_escalation';

export interface PlanResult {
  action: Action;
  reason: string;     // human-readable, shown in trace and to student
  ruleId: number;     // which planner rule fired (1-9)
  targetMisconception?: string;
  targetPrerequisite?: string;
}

// ---- Assessment ---------------------------------------------

export interface AssessmentResult {
  question_id: string;
  correct: boolean;
  partial?: boolean;
  confidence: number;   // 0-1 how sure the evaluator is
  reasoning_category: 'key_match' | 'option_match' | 'llm_scored';
  misconception_id: string | null;
}

// ---- Content Bundle (output of RETRIEVE node) ---------------

export interface ContentBundle {
  topic: Topic;
  lang: LangCode;
  glossaryChips: GlossaryEntry[];
  prerequisiteTopics: Topic[];
  fallback_language?: LangCode; // set if content not available in requested lang
}

// ---- Explanation (output of TEACH node) ---------------------

export interface Explanation {
  text: string;          // final rendered text in student's language
  glossaryChips: GlossaryEntry[];
  mode: 'template' | 'llm_rephrase';
  source_pack: string;   // pack_id
}

// ---- Intent -------------------------------------------------

export type IntentType = 'ask_concept' | 'practice' | 'review' | 'unknown';

export interface Intent {
  type: IntentType;
  topic_id: string | null;
  score: number;           // alias match score 0-1
  language: LangCode;
  raw_input: string;
}

// ---- Network Status -----------------------------------------

export type NetworkStatus = 'ONLINE' | 'OFFLINE' | 'RECONNECTING' | 'SYNCING';

// ---- Progress Event -----------------------------------------

export type EventType =
  | 'topic_viewed'
  | 'explanation_shown'
  | 'quiz_answered'
  | 'misconception_detected'
  | 'misconception_cleared'
  | 'mastery_updated'
  | 'next_action_selected'
  | 'escalation_created'
  | 'language_changed'
  | 'baseline_check'        // MR-80: first-entry diagnostic
  | 'post_check'            // MR-80: post-intervention check
  | 'content_flagged'       // MR-15: student reported a problem
  | 'self_difficulty';      // MR-12: easy/okay/hard tap

export type SyncStatus = 'pending' | 'synced' | 'rejected';

export interface ProgressEvent {
  event_id: string;           // UUIDv4
  student_id: string;
  topic_id: string;
  event_type: EventType;
  payload: Record<string, unknown>;
  timestamp: string;          // ISO client wall-clock
  client_timestamp: string;   // MR-50: same as timestamp at creation
  seq: number;                // MR-50: monotonic per-device counter
  sync_status: SyncStatus;
  device_id: string;
  rejection_reason?: string;
}

// ---- Trace --------------------------------------------------

export interface TraceStep {
  node: string;
  tool?: string | string[];
  detected?: Record<string, unknown>;
  state?: Partial<LearnerState>;
  action?: Action;
  reason?: string;
  source?: string;
  mode?: string;
  delta?: Record<string, unknown>;
  misconception?: string;
  questions?: number;
  durationMs?: number;
  error?: string;
}

export interface TurnTrace {
  turn_id: string;
  student_id: string;
  network: NetworkStatus;
  timestamp: string;
  steps: TraceStep[];
}

// ---- Agent Context (per-turn state machine) -----------------

export type InputType = 'question' | 'tap_topic' | 'answer' | 'next';

export interface AgentInput {
  type: InputType;
  text?: string;
  choiceId?: string;  // for tap_topic or MCQ answer
  topicId?: string;
  answerTimeSec?: number;     // MR-23 P2: milliseconds taken to answer
}

export interface AgentContext {
  turnId: string;
  studentId: string;
  deviceId: string;
  input: AgentInput;
  profile?: StudentProfile;
  intent?: Intent;
  topicId?: string;
  learnerState?: LearnerState;
  plan?: PlanResult;
  content?: ContentBundle;
  explanation?: Explanation;
  quiz?: QuizQuestion[];
  quizQuestionIds?: string[];     // ordered IDs for resume (MR-14)
  seenQuestionIds?: Set<string>;  // excluded from this session (MR-21)
  assessment?: AssessmentResult;
  selfDifficulty?: SelfDifficulty;  // MR-12: user tap after explanation/quiz
  availableTimeMin?: number;        // MR-13: set on StudyTimePage
  resumeState?: ResumeState;        // MR-14: set at boot if interrupted
  network: NetworkStatus;
  trace: TraceStep[];
  error?: string;
}

// ---- Tool interface -----------------------------------------

export interface ToolResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  durationMs: number;
}
