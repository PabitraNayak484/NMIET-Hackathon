// ============================================================
// DB Repository — typed CRUD helpers for all stores
// v2: adds profile, resume, quiz-seen, seq management, prune
// ============================================================
import { db } from './schema';
import type {
  StudentProfile, LearnerState, ProgressEvent,
  LangCode, ProfileRecord, ResumeState, QuizSeenRecord,
} from '../types';
import type { ContentTopicRecord, GlossaryRecord, QuizBankRecord } from './schema';

const INITIAL_MASTERY = 0.3;

// ---- Student (legacy single-profile path) -------------------

export async function getProfile(id: string): Promise<StudentProfile | undefined> {
  return db.student.get(id);
}

export async function saveProfile(profile: StudentProfile): Promise<void> {
  await db.student.put(profile);
}

export async function getFirstProfile(): Promise<StudentProfile | undefined> {
  return db.student.toCollection().first();
}

// ---- Multi-profile store (MR-01) ----------------------------

export async function listProfiles(): Promise<ProfileRecord[]> {
  try {
    const profiles = await db.profiles.toArray();
    return profiles.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  } catch (err) {
    console.error('[repo] listProfiles failed:', err);
    return [];
  }
}

export async function getProfileRecord(profile_id: string): Promise<ProfileRecord | undefined> {
  return db.profiles.get(profile_id);
}

export async function upsertProfileRecord(p: ProfileRecord): Promise<void> {
  await db.profiles.put(p);
}

export async function deleteProfileRecord(profile_id: string): Promise<void> {
  await db.profiles.delete(profile_id);
}

// ---- Learning State -----------------------------------------

export async function getLearningState(
  student_id: string,
  topic_id: string
): Promise<LearnerState> {
  const existing = await db.learning_state.get([student_id, topic_id]);
  if (existing) return existing;

  // Initialise with mastery = 0.3 (avoids false certainty of 0 or 0.5)
  const initial: LearnerState = {
    student_id,
    topic_id,
    mastery_score:  INITIAL_MASTERY,
    confidence:     0,
    attempt_count:  0,
    correct_count:  0,
    misconceptions: [],
    last_activity:  new Date().toISOString(),
    next_action:    null,
    updatedAt:      new Date().toISOString(),
  };
  await db.learning_state.put(initial);
  return initial;
}

export async function saveLearningState(state: LearnerState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await db.learning_state.put(state);
}

export async function getWeakTopics(student_id: string): Promise<LearnerState[]> {
  return db.learning_state
    .where('student_id').equals(student_id)
    .filter(s => s.mastery_score < 0.5 || s.misconceptions.length > 0)
    .toArray();
}

/** Delete all learning state rows belonging to a profile (MR-04). */
export async function deleteLearningStateForProfile(student_id: string): Promise<void> {
  await db.learning_state
    .where('student_id').equals(student_id)
    .delete();
}

// ---- Progress Events ----------------------------------------

/**
 * Append a progress event.
 * Auto-assigns seq by reading + incrementing the 'event_seq' meta key.
 * seq is monotonic per device — used for clock-skew handling (MR-50).
 */
export async function appendProgressEvent(event: ProgressEvent): Promise<void> {
  // Read-modify-write the seq counter atomically via Dexie transaction
  await db.transaction('rw', db.progress_events, db.meta, async () => {
    const seqRecord = await db.meta.get('event_seq');
    const nextSeq = seqRecord ? parseInt(seqRecord.value, 10) + 1 : 1;
    await db.meta.put({ key: 'event_seq', value: String(nextSeq) });
    event.seq = nextSeq;
    event.client_timestamp = event.timestamp;
    await db.progress_events.put(event);
  });
}

export async function getPendingEvents(): Promise<ProgressEvent[]> {
  return db.progress_events
    .where('sync_status').equals('pending')
    .sortBy('seq');   // MR-50: order by seq, not wall-clock
}

export async function markEventsSynced(event_ids: string[]): Promise<void> {
  await db.progress_events
    .where('event_id').anyOf(event_ids)
    .modify({ sync_status: 'synced' });
}

export async function markEventsRejected(
  rejections: Array<{ event_id: string; reason: string }>
): Promise<void> {
  for (const { event_id, reason } of rejections) {
    await db.progress_events
      .where('event_id').equals(event_id)
      .modify({ sync_status: 'rejected', rejection_reason: reason });
  }
}

export async function countPendingEvents(): Promise<number> {
  return db.progress_events.where('sync_status').equals('pending').count();
}

/**
 * Delete all progress events for a profile (MR-04 — clear per profile).
 */
export async function deleteEventsForProfile(student_id: string): Promise<void> {
  await db.progress_events
    .where('student_id').equals(student_id)
    .delete();
}

/**
 * Prune synced events older than `days` (MR-41, default 30 days).
 * Returns the count of deleted rows.
 */
export async function pruneOldSyncedEvents(days = 30): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const toDelete = await db.progress_events
    .where('sync_status').equals('synced')
    .filter(e => e.timestamp < cutoff)
    .primaryKeys();
  await db.progress_events.bulkDelete(toDelete as string[]);
  return toDelete.length;
}

// ---- Resume State (MR-14) -----------------------------------

export async function saveResumeState(state: ResumeState): Promise<void> {
  await db.resume_state.put(state);
}

export async function getResumeState(
  profile_id: string,
  topic_id: string
): Promise<ResumeState | undefined> {
  return db.resume_state.get([profile_id, topic_id]);
}

export async function clearResumeState(profile_id: string, topic_id: string): Promise<void> {
  await db.resume_state.delete([profile_id, topic_id]);
}

export async function clearAllResumeStatesForProfile(profile_id: string): Promise<void> {
  await db.resume_state.where('profile_id').equals(profile_id).delete();
}

// ---- Quiz-seen (MR-21 — no repeat until bank exhausted) -----

function seenKey(profile_id: string, topic_id: string, question_id: string): string {
  return `${profile_id}::${topic_id}::${question_id}`;
}

export async function markQuestionSeen(
  profile_id: string,
  topic_id: string,
  question_id: string
): Promise<void> {
  const record: QuizSeenRecord = {
    id:          seenKey(profile_id, topic_id, question_id),
    profile_id,
    topic_id,
    question_id,
    last_seen:   new Date().toISOString(),
  };
  await db.quiz_seen.put(record);
}

/**
 * Returns questions from `bank` that haven't been seen by this profile for
 * this topic.  When all are exhausted, resets the seen log and returns the
 * full shuffled bank (so the student eventually sees everything, MR-21).
 */
export async function getUnseenQuestions(
  profile_id: string,
  topic_id: string,
  bank: QuizBankRecord[]
): Promise<QuizBankRecord[]> {
  const seenRecords = await db.quiz_seen
    .where('[profile_id+topic_id]').equals([profile_id, topic_id])
    .toArray();

  const seenIds = new Set(seenRecords.map(r => r.question_id));
  const unseen = bank.filter(q => !seenIds.has(q.question_id));

  if (unseen.length === 0) {
    // All seen — reset so the cycle starts again
    await db.quiz_seen.where('[profile_id+topic_id]').equals([profile_id, topic_id]).delete();
    return shuffleArray(bank);
  }

  return shuffleArray(unseen);
}

export async function deleteQuizSeenForProfile(profile_id: string): Promise<void> {
  await db.quiz_seen.where('profile_id').equals(profile_id).delete();
}

// ---- Content Topics -----------------------------------------

export async function getTopicById(topic_id: string): Promise<ContentTopicRecord | undefined> {
  return db.content_topics.get(topic_id);
}

export async function getTopicsByClass(
  classNum: number,
  subject: string
): Promise<ContentTopicRecord[]> {
  return db.content_topics
    .where('[class+subject]' as any)
    .equals([classNum, subject])
    .toArray()
    .catch(() =>
      // Fallback: filter in JS if compound index not supported
      db.content_topics.filter(t => t.class === classNum && t.subject === subject).toArray()
    );
}

export async function getAllTopics(): Promise<ContentTopicRecord[]> {
  return db.content_topics.toArray();
}

// ---- Glossary -----------------------------------------------

export async function getGlossaryEntry(
  term_id: string,
  language_code: LangCode
): Promise<GlossaryRecord | undefined> {
  return db.glossary.get([term_id, language_code]);
}

export async function getGlossaryForTopic(
  topic_id: string,
  _language_code: LangCode
): Promise<GlossaryRecord[]> {
  const topic = await db.content_topics.get(topic_id);
  if (!topic) return [];
  return db.glossary
    .where('pack_id').equals(topic.pack_id)
    .filter(g => g.protected === true)
    .toArray();
}

// ---- Quiz Bank ----------------------------------------------

export async function getQuizForTopic(
  topic_id: string,
  difficulty?: 'easy' | 'medium' | 'hard',
  limit = 3
): Promise<QuizBankRecord[]> {
  const all = await db.quiz_bank.where('topic_id').equals(topic_id).toArray();
  const filtered = difficulty ? all.filter(r => r.difficulty === difficulty) : all;
  return shuffleArray(filtered).slice(0, limit);
}

// ---- Language Packs -----------------------------------------

export async function getLanguagePack(code: LangCode) {
  return db.language_packs.get(code);
}

// ---- Meta ---------------------------------------------------

export async function getMeta(key: string): Promise<string | undefined> {
  const r = await db.meta.get(key);
  return r?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}

// ---- Helpers ------------------------------------------------

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
