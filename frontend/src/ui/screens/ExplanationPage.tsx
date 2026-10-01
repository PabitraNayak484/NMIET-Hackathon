// ExplanationPage — /explain
// Explanation + glossary chips, difficulty tap (MR-12), Report Problem (MR-15)
import React, { useState } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { useProfileStore } from '../../stores/profileStore';
import { NetworkBadge } from '../components/NetworkBadge';
import { GlossaryChip } from '../components/GlossaryChip';
import { DifficultyTap } from '../components/DifficultyTap';
import { ReportProblem } from '../components/ReportProblem';
import { NextActionCard } from '../components/NextActionCard';
import { MasteryBar } from '../components/MasteryBar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { SelfDifficulty } from '../../types';

export function ExplanationPage() {
  const { context, setContext, setScreen, loading, setLoading, loadingMessage } = useAgentStore();
  const { activeProfile } = useProfileStore();
  const [diffSelected, setDiffSelected] = useState<SelfDifficulty | null>(null);
  const [proceedLoading, setProceedLoading] = useState(false);

  const explanation = context?.explanation;
  const plan = context?.plan;
  const lang = context?.profile?.language ?? activeProfile?.language ?? 'en';

  async function handleDifficulty(d: SelfDifficulty) {
    setDiffSelected(d);
    if (!context) return;
    // Save self_difficulty event
    try {
      const { appendProgressEvent } = await import('../../db/repo');
      const { v4: uuidv4 } = await import('uuid');
      await appendProgressEvent({
        event_id: uuidv4(),
        student_id: context.studentId,
        topic_id: context.topicId ?? '',
        event_type: 'self_difficulty',
        payload: { difficulty: d, screen: 'explanation' },
        timestamp: new Date().toISOString(),
        client_timestamp: new Date().toISOString(),
        seq: 0,
        sync_status: 'pending',
        device_id: context.deviceId,
      });
    } catch (e) {
      console.error(e);
    }
  }

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
      else setScreen('feedback');
    } catch (e) {
      console.error(e);
    } finally {
      setProceedLoading(false);
      setLoading(false);
    }
  }

  if (!explanation) {
    return (
      <div className="screen flex-center flex-col" style={{ minHeight: '100dvh' }}>
        <div className="spinner spinner-lg" aria-label="Loading explanation" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="screen fade-in">
        <NetworkBadge />

        <div className="screen-header">
          <button className="icon-btn" onClick={() => setScreen('home')} aria-label="Back to home">←</button>
          <h1 className="screen-title">Explanation</h1>
          <span className="badge badge-accent">{explanation.mode === 'llm_rephrase' ? '✨ AI' : '📚 Book'}</span>
        </div>

        <div className="scroll-area">
          {/* Mastery bar */}
          {context?.learnerState && (
            <div className="mb-6">
              <MasteryBar mastery={context.learnerState.mastery_score} />
            </div>
          )}

          {/* Explanation text */}
          <div
            className="card slide-up mb-4"
            style={{ lineHeight: 1.8, fontSize: 'var(--text-base)' }}
            aria-label="Explanation"
          >
            <p style={{ color: 'var(--text-primary)', margin: 0 }}>{explanation.text}</p>

            {/* Glossary chips */}
            {explanation.glossaryChips.length > 0 && (
              <div className="chip-grid mt-4">
                {explanation.glossaryChips.map((entry) => (
                  <GlossaryChip
                    key={entry.term_id}
                    entry={entry}
                    lang={lang as any}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Report problem */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-muted text-xs">Source: {explanation.source_pack}</span>
            {context && (
              <ReportProblem
                topicId={context.topicId ?? ''}
                studentId={context.studentId}
              />
            )}
          </div>

          {/* Difficulty tap (MR-12) */}
          <div className="card mb-6">
            <DifficultyTap onSelect={handleDifficulty} selected={diffSelected} />
          </div>

          {/* Next action */}
          {plan && (
            <NextActionCard
              plan={plan}
              onContinue={handleContinue}
              loading={proceedLoading}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
