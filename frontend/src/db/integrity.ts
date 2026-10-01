// ============================================================
// DB Integrity — boot-time checks and seed loading
// ============================================================
import { db } from './schema';
import { setMeta, getMeta } from './repo';

const SCHEMA_VERSION = '1';
const SEED_PACK_PATH = '/content/packs/class7-science-v1.json';
const SEED_LANGS     = ['en', 'hi', 'or'] as const;

/**
 * Run on every app boot. Returns true if the DB is healthy.
 * On corruption, rebuilds from bundled seed content.
 */
export async function checkAndRepairDB(): Promise<boolean> {
  try {
    await db.open();

    // Schema version check
    const storedVersion = await getMeta('schema_version');
    if (storedVersion !== SCHEMA_VERSION) {
      console.warn('[DB] Schema version mismatch — running migration');
      await setMeta('schema_version', SCHEMA_VERSION);
    }

    // Sanity: attempt a read from each critical store
    await db.meta.count();
    await db.content_topics.count();
    await db.language_packs.count();

    return true;
  } catch (err) {
    console.error('[DB] Integrity check failed:', err);
    await rebuildFromSeed();
    return false;
  }
}

/**
 * Load seed content pack and language packs into IndexedDB.
 * Safe to call multiple times — uses put() (idempotent).
 */
export async function seedIfEmpty(): Promise<void> {
  const topicCount = await db.content_topics.count();
  const langCount  = await db.language_packs.count();
  if (topicCount > 0 && langCount > 0) return; // already seeded

  console.info('[DB] Seeding from bundled content...');
  await loadPackFromURL(SEED_PACK_PATH);

  for (const code of SEED_LANGS) {
    await loadLanguagePackFromURL(`/content/languages/${code}.json`);
  }

  await setMeta('seeded_at', new Date().toISOString());
  console.info('[DB] Seed complete');
}

export async function loadPackFromURL(url: string): Promise<void> {
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch pack: ${url}`);
  const pack = await res.json();

  await db.transaction('rw', db.content_topics, db.glossary, db.quiz_bank, async () => {
    for (const topic of pack.topics) {
      await db.content_topics.put({
        ...topic,
        pack_id: pack.pack_id,
        subject: pack.meta.subject,
        class:   pack.meta.class,
      });

      for (const q of topic.quiz) {
        await db.quiz_bank.put({ ...q, topic_id: topic.topic_id, pack_id: pack.pack_id });
      }
    }

    for (const entry of pack.glossary) {
      for (const langCode of ['en', 'hi', 'or'] as const) {
        if (entry.gloss[langCode]) {
          await db.glossary.put({ ...entry, language_code: langCode, pack_id: pack.pack_id });
        }
      }
    }
  });
}

export async function loadLanguagePackFromURL(url: string): Promise<void> {
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch language pack: ${url}`);
  const pack = await res.json();
  await db.language_packs.put(pack);
}

async function rebuildFromSeed(): Promise<void> {
  console.warn('[DB] Attempting to rebuild from seed...');
  try {
    await db.delete();
    await db.open();
    await seedIfEmpty();
    console.info('[DB] Rebuild successful');
  } catch (err) {
    console.error('[DB] Rebuild failed — app may be degraded:', err);
  }
}

/** Wipe all local data and generate a fresh anonymous profile. */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw',
    db.student, db.learning_state, db.progress_events, db.meta,
    async () => {
      await db.student.clear();
      await db.learning_state.clear();
      await db.progress_events.clear();
      await db.meta.clear();
    }
  );
  // Keep content and language packs — they are not personal data
}
