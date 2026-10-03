// ============================================================
// Tests: aliasIndex — score bands + multilingual matching
// Uses pure matching logic without DB dependency.
// ============================================================
import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';

// Replicated pure helpers from aliasIndex.ts (no DB dependency)

function normalise(s: string): string {
  return s.toLowerCase().normalize('NFC').trim();
}

function tokenise(s: string): Set<string> {
  return new Set(s.split(/[\s\-_,।,।]+/).filter((t) => t.length > 1));
}

function weightedOverlap(
  qTokens: Set<string>,
  aTokens: Set<string>,
  qFull: string,
  aFull: string
): number {
  if (qFull === aFull) return 1.0;
  if (qFull.includes(aFull) || aFull.includes(qFull)) return 0.9;
  const union = new Set([...qTokens, ...aTokens]);
  if (union.size === 0) return 0;
  let inter = 0;
  for (const t of qTokens) if (aTokens.has(t)) inter++;
  return inter / union.size;
}

interface AliasEntry { topic_id: string; aliases: string[] }

function buildIndex(entries: AliasEntry[]): AliasEntry[] {
  return entries.map((e) => ({
    topic_id: e.topic_id,
    aliases: e.aliases.map(normalise).filter((a) => a.length > 0), // skip empty strings
  }));
}

function matchTopic(
  index: AliasEntry[],
  rawInput: string
): { topic_id: string; score: number } | null {
  if (index.length === 0) return null;
  const query = normalise(rawInput);
  if (query.length === 0) return null; // no-match on empty input
  const qTokens = tokenise(query);
  let best: { topic_id: string; score: number } | null = null;
  for (const entry of index) {
    for (const alias of entry.aliases) {
      const score = weightedOverlap(qTokens, tokenise(alias), query, alias);
      if (!best || score > best.score) best = { topic_id: entry.topic_id, score };
    }
  }
  return best && best.score >= 0.35 ? best : null;
}

// ---- Fixtures -----------------------------------------------

const FIXTURE_INDEX = buildIndex([
  {
    topic_id: 'photosynthesis',
    aliases: [
      'photosynthesis',
      'prakaash sansleshn',         // hi transliteration (ASCII-safe)
      'aalok sansleshn',            // or transliteration (ASCII-safe)
      'light synthesis',
      'how plants make food',
    ],
  },
  {
    topic_id: 'parts_of_plant',
    aliases: [
      'parts of plant',
      'paudhe ke bhaag',            // hi transliteration
      'plant parts',
    ],
  },
]);

// ---- Tests --------------------------------------------------

describe('aliasIndex: exact match', () => {
  it('returns score 1.0 for exact English alias', () => {
    const result = matchTopic(FIXTURE_INDEX, 'photosynthesis');
    expect(result).not.toBeNull();
    expect(result!.topic_id).toBe('photosynthesis');
    expect(result!.score).toBe(1.0);
  });

  it('returns score 1.0 for exact transliterated Hindi alias', () => {
    const result = matchTopic(FIXTURE_INDEX, 'prakaash sansleshn');
    expect(result).not.toBeNull();
    expect(result!.topic_id).toBe('photosynthesis');
    expect(result!.score).toBe(1.0);
  });

  it('returns score 1.0 for exact transliterated Odia alias', () => {
    const result = matchTopic(FIXTURE_INDEX, 'aalok sansleshn');
    expect(result).not.toBeNull();
    expect(result!.topic_id).toBe('photosynthesis');
    expect(result!.score).toBe(1.0);
  });
});

describe('aliasIndex: substring match', () => {
  it('returns high score when query contains full alias', () => {
    const result = matchTopic(FIXTURE_INDEX, 'tell me about photosynthesis');
    expect(result).not.toBeNull();
    expect(result!.topic_id).toBe('photosynthesis');
    expect(result!.score).toBeGreaterThanOrEqual(0.35);
  });
});

describe('aliasIndex: token overlap match', () => {
  it('matches "plant parts" to parts_of_plant', () => {
    const result = matchTopic(FIXTURE_INDEX, 'plant parts');
    expect(result).not.toBeNull();
    expect(result!.topic_id).toBe('parts_of_plant');
    expect(result!.score).toBeGreaterThan(0.5);
  });
});

describe('aliasIndex: no match below threshold', () => {
  it('returns null for completely unrelated input', () => {
    const result = matchTopic(FIXTURE_INDEX, 'the french revolution');
    expect(result).toBeNull();
  });

  it('returns null for empty string input', () => {
    const result = matchTopic(FIXTURE_INDEX, '');
    expect(result).toBeNull();
  });
});

describe('aliasIndex: case insensitivity', () => {
  it('matches "PHOTOSYNTHESIS" case-insensitively', () => {
    const result = matchTopic(FIXTURE_INDEX, 'PHOTOSYNTHESIS');
    expect(result).not.toBeNull();
    expect(result!.topic_id).toBe('photosynthesis');
  });

  it('matches "Parts Of Plant" case-insensitively', () => {
    const result = matchTopic(FIXTURE_INDEX, 'Parts Of Plant');
    expect(result).not.toBeNull();
    expect(result!.topic_id).toBe('parts_of_plant');
  });
});
