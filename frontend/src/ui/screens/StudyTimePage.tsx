// StudyTimePage — /time (MR-13)
// 3 large chips: 5 / 10 / 20 min → sets available_time
import React, { useState } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { useProfileStore } from '../../stores/profileStore';
import { NetworkBadge } from '../components/NetworkBadge';
import { ErrorBoundary } from '../components/ErrorBoundary';

const TIME_OPTIONS = [
  { value: 5,  emoji: '⚡', label: '5 min',  desc: 'Quick burst' },
  { value: 10, emoji: '🎯', label: '10 min', desc: 'Focused session' },
  { value: 20, emoji: '🚀', label: '20 min', desc: 'Deep dive' },
];

export function StudyTimePage() {
  const { setScreen, setAvailableTimeMin } = useAgentStore();
  const { activeProfile } = useProfileStore();
  const [selected, setSelected] = useState<number | null>(10);

  const isEarlyGrade = activeProfile && activeProfile.class <= 3;
  const tapHeight = isEarlyGrade ? 'var(--tap-early)' : '120px';

  function handleContinue() {
    setAvailableTimeMin(selected ?? 10);
    setScreen('home');
  }

  return (
    <ErrorBoundary>
      <div className="screen fade-in">
        <NetworkBadge />

        <div style={{ padding: 'var(--space-10) 0 var(--space-6)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }} aria-hidden="true">⏱️</div>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>
            Hi {activeProfile?.avatar} {activeProfile?.nickname}!
          </h1>
          <p className="text-secondary">How much time do you have today?</p>
        </div>

        <div className="flex-col gap-4 stagger">
          {TIME_OPTIONS.map(({ value, emoji, label, desc }) => (
            <button
              key={value}
              id={`time-${value}`}
              className="card interactive"
              onClick={() => setSelected(value)}
              aria-pressed={selected === value}
              aria-label={`${label} — ${desc}`}
              style={{
                minHeight: tapHeight,
                padding: 'var(--space-6)',
                borderColor: selected === value ? 'var(--primary)' : undefined,
                background: selected === value ? 'var(--primary-dim)' : undefined,
                borderWidth: selected === value ? 2 : 1,
              }}
            >
              <div className="flex items-center gap-5">
                <span style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">{emoji}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontSize: 'var(--text-2xl)', fontWeight: 800,
                    color: selected === value ? 'var(--primary)' : 'var(--text-primary)',
                  }}>
                    {label}
                  </div>
                  <div className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{desc}</div>
                </div>
                {selected === value && (
                  <span
                    aria-hidden="true"
                    style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: '1.8rem' }}
                  >
                    ✓
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="bottom-action">
          <button
            id="study-time-continue-btn"
            className="btn btn-primary btn-full btn-lg"
            onClick={handleContinue}
            aria-label={`Continue with ${selected} minutes study time`}
          >
            Let's go! →
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
