// ============================================================
// i18n Loader — loads language packs from IndexedDB
// ============================================================
import { getLanguagePack } from '../db/repo';
import type { LangCode, LanguagePack } from '../types';

const cache = new Map<LangCode, LanguagePack>();

export async function loadLanguagePack(code: LangCode): Promise<LanguagePack | null> {
  if (cache.has(code)) return cache.get(code)!;
  const pack = await getLanguagePack(code);
  if (pack) cache.set(code, pack);
  return pack ?? null;
}

export function clearLanguageCache(): void {
  cache.clear();
}
