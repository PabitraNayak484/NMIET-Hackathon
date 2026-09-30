// FeedbackPage — /feedback
// Correct/incorrect, misconception label, mastery bar animation, next-action card
import React, { useEffect, useState } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { useProfileStore } from '../../stores/profileStore';
import { NetworkBadge } from '../components/NetworkBadge';
import { MasteryBar } from '../components/MasteryBar';
import { NextActionCard } from '../components/NextActionCard';
import { UpdateReadyBanner } from '../components/UpdateReadyBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';

export function FeedbackPage() {
  const { context, setContext, setScreen, setLoading, loading } = useAgentStore();
  const { activeProfile } = useProfileStore();
  const [updateReady, setUpdateReady] = useState(false);
  const [proceedLoading, setProceedLoading] = useState(false);

  // Check for SW update (MR-42) — only show after session
  useEffect(() => {
    const hasUpdate = sessionStorage.getItem('sathi_update_ready') === '1';
    setUpdateReady(hasUpdate);
  }, []);

  const assessment = context?.assessment;
  const plan = context?.plan;
  const learnerState = context?.learnerState;
  const lang = context?.profile?.language ?? activeProfile?.language ?? 'en';

  const isCorrect = assessment?.correct ?? false;
  const misconceptionId = assessment?.misconception_id;

  async function handleContinue() {
    if (!context || !plan) return;
    setProceedLoading(true);
    setLoading(true, 'SATHI is preparing…');
    try {
      const { runTurn } = await import('../../agent/orchestrator');
      const nextCtx = await runTurn(
        context.studentId,
        context.deviceId,
        { type: 'next' },
      );
      setContext(nextCtx);
      const action = nextCtx.plan?.action;
      if (action === 'quiz' || action === 'practice') setScreen('quiz');
      else if (action === 'explain' || action === 'give_example') setScreen('explanation');
      else if (action === 'teacher_escalation') setScreen('home');
      else setScreen('home');
    } catch (e) {
      console.error(e);
    } finally {
      setProceedLoading(false);
      setLoading(false);
    }
  }

  return (
    <ErrorBoundary>
      <div className="screen fade-in">
        <NetworkBadge />

        {/* Update banner — only shown after session (MR-42) */}
        {updateReady && (
          <UpdateReadyBanner
            onUpdate={() => window.location.reload()}
            onDismiss={() => { setUpdateReady(false); sessionStorage.removeItem('sathi_update_ready'); }}
          />
        )}

        <div className="screen-header">
          <h1 className="screen-title">Results</h1>
          <button className="icon-btn" onClick={() => setScreen('home')} aria-label="Back to home">🏠</button>
        </div>

        <div className="scroll-area">
          {/* Outcome hero */}
          <div
            className="card text-center mb-6 scale-in"
            style={{
              borderColor: isCorrect ? 'var(--success)' : 'var(--warning)',
              borderWidth: 2,
              padding: 'var(--space-8)',
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }} aria-hidden="true">
              {isCorrect ? '🎉' : '💡'}
            </div>
            <h2 style={{ color: isCorrect ? 'var(--success)' : 'var(--warning)', marginBottom: 'var(--space-2)' }}>
              {isCorrect ? 'Correct!' : 'Keep going!'}
            </h2>
            <p className="text-secondary">
              {isCorrect
                ? 'Great job! Your mastery is improving.'
                : 'Don\'t worry — making mistakes helps you learn faster.'}
            </p>
          </div>

          {/* Mastery bar with animation */}
          {learnerState && (
            <div className="card mb-6">
              <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-base)' }}>
                📈 Your Progress
              </h3>
              <MasteryBar mastery={learnerState.mastery_score} animate />
              {learnerState.confidence !== undefined && (
                <div className="mt-4">
                  <MasteryBar mastery={learnerState.confidence} label="Confidence" animate />
                </div>
              )}
            </div>
          )}

          {/* Misconception label */}
          {misconceptionId && (
            <div className="card mb-6" style={{ borderColor: 'var(--warning)', borderWidth: 2 }}>
              <div className="flex items-center gap-3 mb-3">
                <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>⚠️</span>
                <h3 style={{ fontSize: 'var(--text-base)' }}>Common Misconception</h3>
              </div>
              <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                This is a common misunderstanding. SATHI will help you work through it with a targeted exercise.
              </p>
              <div className="badge badge-warning mt-3" aria-label={`Misconception: ${misconceptionId}`}>
                {misconceptionId}
              </div>
            </div>
          )}

          {/* Active misconceptions */}
          {learnerState && learnerState.misconceptions.length > 0 && (
            <div className="card mb-6">
              <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                Areas to work on:
              </h3>
              <div className="chip-grid">
                {learnerState.misconceptions.map((m) => (
                  <span key={m} className="badge badge-warning">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Next action */}
          {plan && (
            <NextActionCard plan={plan} onContinue={handleContinue} loading={proceedLoading} />
          )}

          {/* View gaps button */}
          <button
            id="view-gaps-btn"
            className="btn btn-ghost btn-full mt-4"
            onClick={() => setScreen('gaps')}
            aria-label="View your learning gap visualization"
          >
            📊 View learning gaps
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
