// TextSizeControl — 3-level font scale control (MR-71)
import React from 'react';
import { useProfileStore } from '../../stores/profileStore';

const LEVELS = [
  { value: 1 as const, label: 'Small', style: '14px' },
  { value: 2 as const, label: 'Normal', style: '16px' },
  { value: 3 as const, label: 'Large', style: '20px' },
];

export function TextSizeControl() {
  const { textSizeLevel, setTextSizeLevel } = useProfileStore();

  function applyLevel(level: 1 | 2 | 3) {
    setTextSizeLevel(level);
    const sizes: Record<1 | 2 | 3, string> = { 1: '14px', 2: '16px', 3: '20px' };
    document.documentElement.style.setProperty('--base-font-size', sizes[level]);
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Text size">
      {LEVELS.map(({ value, label, style }) => (
        <button
          key={value}
          id={`text-size-${value}`}
          className={`chip${textSizeLevel === value ? ' active' : ''}`}
          onClick={() => applyLevel(value)}
          aria-pressed={textSizeLevel === value}
          aria-label={`Text size: ${label}`}
          style={{ fontSize: style, minHeight: 44, flex: 1, justifyContent: 'center' }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
