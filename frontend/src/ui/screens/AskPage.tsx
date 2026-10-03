// AskPage — /ask
// Free-text input (300 char), hidden for Class 1-3 (MR-11), topic disambiguation chips
import React, { useState } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { useProfileStore } from '../../stores/profileStore';
import { NetworkBadge } from '../components/NetworkBadge';
import { AgentSpinner } from '../components/AgentSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { AgentInput } from '../../types';

const TOPIC_CHIPS = [
  { id: 'photosynthesis', label: '🌿 Photosynthesis', emoji: '🌿' },
  { id: 'parts_of_plant', label: '🌱 Parts of a Plant', emoji: '🌱' },
];

export function AskPage() {
  const { setScreen, setContext, setLoading, loading, loadingMessage, topicId, setTopicId } = useAgentStore();
  const { activeProfile } = useProfileStore();
  const [text, setText] = useState('');

  const isEarlyGrade = activeProfile && activeProfile.class <= 3;
  const tapMin = isEarlyGrade ? 'var(--tap-early)' : 'var(--tap-min)';

  async function handleAsk(input: AgentInput) {
    if (!activeProfile) return;
    setLoading(true, 'SATHI is thinking…');
    try {
      const { runTurn } = await import('../../agent/orchestrator');
      const deviceId = localStorage.getItem('sathi_device_id') ?? 'device_1';

      const ctx = await runTurn(
        activeProfile.profile_id,
        deviceId,
        input,
      );

      setContext(ctx);
      const plan = ctx.plan?.action;
      if (plan === 'explain' || plan === 'give_example') setScreen('explanation');
      else if (plan === 'quiz' || plan === 'practice') setScreen('quiz');
      else setScreen('explanation');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleTopicTap(id: string) {
    setTopicId(id);
    handleAsk({ type: 'tap_topic', topicId: id });
  }

  function handleTextSubmit() {
    if (!text.trim()) return;
    handleAsk({ type: 'question', text: text.trim(), topicId: topicId ?? undefined });
  }

  if (loading) {
    return (
      <div className="screen flex-center flex-col" style={{ minHeight: '100dvh' }}>
        <AgentSpinner message={loadingMessage} large />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="screen fade-in">
        <NetworkBadge />

        <div className="screen-header">
          <button className="icon-btn" onClick={() => setScreen('home')} aria-label="Back to home">←</button>
          <h1 className="screen-title">Ask SATHI</h1>
        </div>

        {/* Early-grade: topic chip picker only (MR-11) */}
        {isEarlyGrade ? (
          <div>
            <p className="text-secondary mb-6" style={{ fontSize: 'var(--text-lg)' }}>
              🌟 What do you want to learn?
            </p>
            <div className="flex-col gap-4 stagger">
              {TOPIC_CHIPS.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  id={`topic-chip-${id}`}
                  className="card interactive"
                  onClick={() => handleTopicTap(id)}
                  aria-label={`Learn about: ${label}`}
                  style={{
                    minHeight: tapMin,
                    padding: 'var(--space-5)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: '2rem' }}>{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Free text input */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <textarea
                id="ask-input"
                className="input"
                placeholder="What do you want to learn? E.g. &quot;Explain photosynthesis&quot;"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 300))}
                maxLength={300}
                rows={3}
                aria-label="Ask a question"
                style={{ minHeight: 100, resize: 'none' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); }
                }}
              />
              <div className="text-muted text-xs" style={{ textAlign: 'right', marginTop: 4 }}>
                {text.length}/300
              </div>
            </div>

            {/* Topic chips for quick-select */}
            <h2 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)', fontWeight: 600 }}>
              Or pick a topic:
            </h2>
            <div className="chip-grid mb-8">
              {TOPIC_CHIPS.map(({ id, label }) => (
                <button
                  key={id}
                  id={`ask-chip-${id}`}
                  className={`chip${topicId === id ? ' active' : ''}`}
                  onClick={() => handleTopicTap(id)}
                  aria-pressed={topicId === id}
                  aria-label={`Select topic: ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="bottom-action">
              <button
                id="ask-submit-btn"
                className="btn btn-primary btn-full btn-lg"
                onClick={handleTextSubmit}
                disabled={!text.trim()}
                aria-label="Ask SATHI"
              >
                🤔 Ask SATHI
              </button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
