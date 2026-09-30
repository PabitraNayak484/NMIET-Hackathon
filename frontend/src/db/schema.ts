// ============================================================
// DB Schema — Dexie (IndexedDB)
// All SATHI learner data lives here.
// v2 adds: profiles, quiz_seen, resume_state stores;
//          progress_events gains seq + client_timestamp index.
// ============================================================
import Dexie, { type Table } from 'dexie';
import type {
  StudentProfile, LearnerState, ProgressEvent,
  Topic, GlossaryEntry, QuizQuestion, LanguagePack,
  ProfileRecord, ResumeState, QuizSeenRecord,
} from '../types';

// ---- Additional stored shapes -------------------------------

export interface MetaRecord {
  key: string;
  value: string;
}

export interface ContentTopicRecord extends Topic {
  pack_id: string;
  subject: string;
  class: number;
}

export interface GlossaryRecord extends GlossaryEntry {
  pack_id: string;
}

export interface QuizBankRecord extends QuizQuestion {
  topic_id: string;
  pack_id: string;
}

// ---- Dexie database class -----------------------------------

export class SathiDB extends Dexie {
  // Original stores (v1)
  student!:        Table<StudentProfile,      string>;
  learning_state!: Table<LearnerState,        [string, string]>;
  progress_events!:Table<ProgressEvent,       string>;
  content_topics!: Table<ContentTopicRecord,  string>;
  glossary!:       Table<GlossaryRecord,      [string, string]>;
  quiz_bank!:      Table<QuizBankRecord,      string>;
  language_packs!: Table<LanguagePack,        string>;
  meta!:           Table<MetaRecord,          string>;

  // New stores (v2)
  profiles!:       Table<ProfileRecord,       string>;  // MR-01
  quiz_seen!:      Table<QuizSeenRecord,      string>;  // MR-21
  resume_state!:   Table<ResumeState,         string>;  // MR-14

  constructor() {
    super('SathiDB');

    // v1 — original schema (never modified — Dexie requires it for upgrades)
    this.version(1).stores({
      student:         'id',
      learning_state:  '[student_id+topic_id], topic_id, mastery_score',
      progress_events: 'event_id, student_id, topic_id, sync_status, timestamp',
      content_topics:  'topic_id, pack_id, subject, class',
      glossary:        '[term_id+language_code], pack_id',
      quiz_bank:       'question_id, topic_id, pack_id, difficulty',
      language_packs:  'language_code',
      meta:            'key',
    });

    // v2 — adds 3 new stores; extends progress_events with seq index
    this.version(2).stores({
      // All v1 stores re-declared (required by Dexie on version bumps)
      student:         'id',
      learning_state:  '[student_id+topic_id], topic_id, mastery_score',
      progress_events: 'event_id, student_id, topic_id, sync_status, timestamp, seq, [device_id+seq]',
      content_topics:  'topic_id, pack_id, subject, class',
      glossary:        '[term_id+language_code], pack_id',
      quiz_bank:       'question_id, topic_id, pack_id, difficulty',
      language_packs:  'language_code',
      meta:            'key',
      // New in v2
      profiles:        'profile_id, created_at',                        // MR-01
      quiz_seen:       'id, [profile_id+topic_id], profile_id, topic_id', // MR-21
      resume_state:    '[profile_id+topic_id], profile_id',              // MR-14
    });
  }
}

export const db = new SathiDB();
