// ============================================================
// i18n Renderer — template engine and glossary chip builder
// ============================================================
import type { LangCode, LanguagePack, GlossaryEntry } from '../types';
import { loadLanguagePack } from './loader';

/**
 * Translate a UI key. Falls back to English, then to the key itself.
 */
export async function t(key: string, lang: LangCode): Promise<string> {
  const pack = await loadLanguagePack(lang);
  if (pack?.ui_translations[key]) return pack.ui_translations[key];

  if (lang !== 'en') {
    const en = await loadLanguagePack('en');
    if (en?.ui_translations[key]) return en.ui_translations[key];
  }
  return key; // last resort
}

/**
 * Synchronous version for contexts where the pack is already loaded.
 */
export function tSync(key: string, pack: LanguagePack, fallbackPack?: LanguagePack): string {
  return pack.ui_translations[key]
    ?? fallbackPack?.ui_translations[key]
    ?? key;
}

/**
 * Render a template string, substituting {placeholder} tokens.
 * e.g. renderTemplate("Question {n} of {m}", { n: 1, m: 3 }) → "Question 1 of 3"
 */
export function renderTemplate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

/**
 * Get a feedback message from the language pack.
 */
export function getFeedback(
  pack: LanguagePack,
  key: keyof LanguagePack['feedback_templates'],
  params: Record<string, string> = {}
): string {
  return renderTemplate(pack.feedback_templates[key], params);
}

/**
 * Build glossary chip data for a given language — returns the term
 * in English and its gloss in the target language.
 */
export function buildGlossaryChip(
  entry: GlossaryEntry,
  lang: LangCode
): { termEn: string; termLocal: string; glossLocal: string } {
  return {
    termEn:    entry.term.en ?? entry.term_id,
    termLocal: entry.term[lang] ?? entry.term.en ?? entry.term_id,
    glossLocal: entry.gloss[lang] ?? entry.gloss.en ?? '',
  };
}

/**
 * Extract text in the requested language from a MultiLang object.
 * Falls back to English if the requested language is absent.
 */
export function localize(
  multiLang: Record<string, string | undefined>,
  lang: LangCode,
  fallbackLang: LangCode = 'en'
): { text: string; usedFallback: boolean } {
  if (multiLang[lang]) return { text: multiLang[lang]!, usedFallback: false };
  if (multiLang[fallbackLang]) return { text: multiLang[fallbackLang]!, usedFallback: true };
  return { text: Object.values(multiLang).find(v => !!v) ?? '', usedFallback: true };
}
