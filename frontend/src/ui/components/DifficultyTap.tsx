// DifficultyTap — easy / okay / hard 3-button widget (MR-12)
// Auto-dismisses after 3 s if no tap. Stored as self_difficulty event.
import React, { useEffect, useState } from 'react';
import type { SelfDifficulty } from '../../types';

interface Props {
  onSelect: (d: SelfDifficulty) => void;
  selected?: SelfDifficulty | null;
  disabled?: boolean;
}

const OPTIONS: { value: SelfDifficulty; emoji: string; label: string }[] = [
  { value: 'easy', emoji: '😊', label: 'Easy' },
  { value: 'okay', emoji: '🤔', label: 'Okay' },
  { value: 'hard', emoji: '😓', label: 'Hard' },
];

export function DifficultyTap({ onSelect, selected = null, disabled = false }: Props) {
  const [local, setLocal] = useState<SelfDifficulty | null>(selected);

  // Auto-dismiss after 3 s if nothing tapped
  useEffect(() => {
    if (local !== null || disabled) return;
    const t = setTimeout(() => onSelect('okay'), 3000);
    return () => clearTimeout(t);
  }, [local, disabled, onSelect]);

  function handleSelect(d: SelfDifficulty) {
    if (disabled) return;
    setLocal(d);
    onSelect(d);
  }

  return (
    <div>
      <p
        className="text-secondary text-sm text-center mb-2"
        style={{ fontWeight: 500 }}
        aria-label="How did this feel?"
      >
        How did this feel?
      </p>
      <div className="flex gap-3" role="group" aria-label="Difficulty self-report">
        {OPTIONS.map(({ value, emoji, label }) => (
          <button
            key={value}
            id={`difficulty-${value}`}
            className={`difficulty-btn ${value}${local === value ? ' selected' : ''}`}
            onClick={() => handleSelect(value)}
            disabled={disabled}
            aria-pressed={local === value}
            aria-label={label}
          >
            <span aria-hidden="true">{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
