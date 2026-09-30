// MasteryBar — animated progress bar with ARIA live region (MR-70)
import React from 'react';

interface Props {
  mastery: number; // 0.0 – 1.0
  label?: string;
  showPercent?: boolean;
  animate?: boolean;
}

function getMasteryClass(mastery: number): string {
  if (mastery >= 0.7) return 'mastery-strong';
  if (mastery >= 0.4) return 'mastery-developing';
  return 'mastery-weak';
}

function getMasteryLabel(mastery: number): string {
  if (mastery >= 0.7) return 'Strong';
  if (mastery >= 0.4) return 'Developing';
  return 'Weak';
}

export function MasteryBar({ mastery, label = 'Mastery', showPercent = true, animate = true }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, mastery)) * 100);
  const cls = getMasteryClass(mastery);
  const lvl = getMasteryLabel(mastery);

  return (
    <div className="mastery-bar-wrap" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${label}: ${pct}% — ${lvl}`}>
      <div className="mastery-bar-label">
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        {showPercent && (
          <span aria-hidden="true" style={{ color: 'var(--text-secondary)' }}>
            {pct}% <span style={{ fontSize: 'var(--text-xs)' }}>— {lvl}</span>
          </span>
        )}
      </div>
      <div className="mastery-bar-track">
        <div
          className={`mastery-bar-fill ${cls}`}
          style={{
            width: `${pct}%`,
            transition: animate ? 'width 600ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          }}
        />
      </div>
    </div>
  );
}
