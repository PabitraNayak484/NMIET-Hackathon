// ============================================================
// Alias Index — maps free-text input → topic_id
// Built from content pack aliases in all languages.
// ============================================================
import { getAllTopics } from '../db/repo';
import type { LangCode } from '../types';

interface AliasEntry {
  topic_id: string;
  aliases:  string[];
}

let index: AliasEntry[] = [];

/** Build the alias index from the DB. Call once after seeding. */
export async function buildAliasIndex(): Promise<void> {
  const topics = await getAllTopics();
  index = topics.map(t => ({
    topic_id: t.topic_id,
    aliases: Object.values(t.aliases).flat().map(normalise),
  }));
}

/** Match user input → {topic_id, score}. Score 0.0 – 1.0. */
export function matchTopic(
  rawInput: string,
  _lang: LangCode
): { topic_id: string; score: number } | null {
  if (index.length === 0) return null;
  const query = normalise(rawInput);
  const queryTokens = tokenise(query);

  let best: { topic_id: string; score: number } | null = null;

  for (const entry of index) {
    for (const alias of entry.aliases) {
      const score = weightedOverlap(queryTokens, tokenise(alias), query, alias);
      if (!best || score > best.score) {
        best = { topic_id: entry.topic_id, score };
      }
    }
  }

  return best && best.score >= 0.35 ? best : null;
}

/** Return top-N candidate topics for disambiguation chips. */
export function getCandidates(
  rawInput: string,
  _lang: LangCode,
  topN = 3
): Array<{ topic_id: string; score: number }> {
  if (index.length === 0) return [];
  const query = normalise(rawInput);
  const queryTokens = tokenise(query);

  const scored: Array<{ topic_id: string; score: number }> = [];

  for (const entry of index) {
    let topScore = 0;
    for (const alias of entry.aliases) {
      const s = weightedOverlap(queryTokens, tokenise(alias), query, alias);
      if (s > topScore) topScore = s;
    }
    if (topScore > 0.15) scored.push({ topic_id: entry.topic_id, score: topScore });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}

// ---- Internals ----------------------------------------------

function normalise(s: string): string {
  return s.toLowerCase().normalize('NFC').trim();
}

function tokenise(s: string): Set<string> {
  return new Set(s.split(/[\s\-_,।,।]+/).filter(t => t.length > 1));
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
