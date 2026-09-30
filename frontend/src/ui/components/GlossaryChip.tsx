// GlossaryChip — tappable term pill showing local-language definition (tooltip)
import React, { useState } from 'react';
import type { GlossaryEntry, LangCode } from '../../types';

interface Props {
  entry: GlossaryEntry;
  lang: LangCode;
}

export function GlossaryChip({ entry, lang }: Props) {
  const [open, setOpen] = useState(false);
  const term = entry.term[lang] ?? entry.term.en ?? '';
  const gloss = entry.gloss[lang] ?? entry.gloss.en ?? '';

  return (
    <span className="tooltip-wrap">
      <button
        className="glossary-chip"
        aria-expanded={open}
        aria-label={`Glossary: ${term} — tap to see definition`}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        📖 {term}
      </button>
      {open && (
        <div className="tooltip-body" role="tooltip">
          <strong>{term}:</strong> {gloss}
        </div>
      )}
    </span>
  );
}
