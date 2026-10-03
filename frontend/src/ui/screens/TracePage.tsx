// TracePage — /trace
// Full Phase 5 implementation:
//   · Collapsed summary strip  (tools used · next action · network status)
//   · Expandable node timeline (icon, tool names, state delta)
//   · "Show technical view" toggle → pretty-printed JSON
//   · Plain-language summary in student's language
import React, { useState } from 'react';
import { useAgentStore }   from '../../stores/agentStore';
import { NetworkBadge }    from '../components/NetworkBadge';
import { TraceTimeline }   from '../components/TraceTimeline';
import { ErrorBoundary }   from '../components/ErrorBoundary';
import { summariseTrace, humanReadableTrace } from '../../trace/recorder';
import type { TurnTrace }  from '../../trace/model';

// ---- Build a TurnTrace snapshot from the flat trace array ---

function buildTurnTrace(ctx: ReturnType<typeof useAgentStore.getState>['context']): TurnTrace | null {
  if (!ctx) return null;
  return {
    turn_id:    ctx.turnId,
    student_id: ctx.studentId,
    network:    ctx.network,
    timestamp:  new Date().toISOString(),
    steps:      ctx.trace,
  };
}

// ---- Sub-components -----------------------------------------

interface SummaryStripProps {
  turnTrace: TurnTrace;
  nextAction: string;
}

function SummaryStrip({ turnTrace, nextAction }: SummaryStripProps) {
  const toolCount   = turnTrace.steps.filter((s) => s.tool).length;
  const nodeCount   = turnTrace.steps.length;
  const networkIcon = turnTrace.network === 'OFFLINE' ? '📴 Offline' : '🌐 ' + turnTrace.network;

  return (
    <div className="card mb-6" style={{ padding: 'var(--space-4) var(--space-5)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        <div className="text-center">
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--primary)' }}>{nodeCount}</div>
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Steps</div>
        </div>
        <div className="text-center">
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--accent)' }}>{toolCount}</div>
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Tools used</div>
        </div>
        <div className="text-center">
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: turnTrace.network === 'OFFLINE' ? 'var(--error)' : 'var(--success)' }}>
            {networkIcon}
          </div>
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Network</div>
        </div>
      </div>

      {nextAction !== '—' && (
        <div className="mt-4" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Next action:</span>
          <span className="badge" style={{ backgroundColor: 'var(--accent)', color: '#000', fontWeight: 700 }}>{nextAction}</span>
        </div>
      )}

      <p className="text-muted mt-3" style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic' }}>
        {summariseTrace(turnTrace)}
      </p>
    </div>
  );
}

interface PlainLanguageViewProps {
  lines: string[];
}

function PlainLanguageView({ lines }: PlainLanguageViewProps) {
  if (lines.length === 0) return null;
  return (
    <div className="card mb-4" style={{ padding: 'var(--space-4) var(--space-5)' }}>
      <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--primary)', marginBottom: 'var(--space-3)' }}>
        🧠 What SATHI did
      </h2>
      <ol style={{ paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {lines.map((line, i) => (
          <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{line}</li>
        ))}
      </ol>
    </div>
  );
}

// ---- Main page component ------------------------------------

export function TracePage() {
  const { setScreen, context } = useAgentStore();
  const [showJson, setShowJson] = useState(false);

  const trace = context?.trace ?? [];
  const lang  = context?.profile?.language ?? 'en';
  const nextAction = context?.plan?.action ?? '—';

  const turnTrace = buildTurnTrace(context ?? null);
  const plainLines = turnTrace ? humanReadableTrace(turnTrace) : [];

  return (
    <ErrorBoundary>
      <div className="screen fade-in">
        <NetworkBadge />

        {/* ---- Header ---- */}
        <div className="screen-header">
          <button
            id="trace-back-btn"
            className="icon-btn"
            onClick={() => setScreen('home')}
            aria-label="Back to home"
          >
            ←
          </button>
          <h1 className="screen-title">Decision Trace</h1>

          {/* JSON toggle button */}
          {trace.length > 0 && (
            <button
              id="trace-json-toggle"
              className="btn btn-ghost"
              style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', padding: '0 var(--space-3)' }}
              onClick={() => setShowJson((v) => !v)}
              aria-pressed={showJson}
            >
              {showJson ? '📋 Timeline' : '{ } JSON'}
            </button>
          )}
        </div>

        {trace.length === 0 ? (
          /* ---- Empty state ---- */
          <div className="card text-center" style={{ padding: 'var(--space-10)' }}>
            <span aria-hidden="true" style={{ fontSize: '2.5rem' }}>🔬</span>
            <p className="text-secondary mt-4">
              No trace yet. Complete a learning session to see SATHI's decision process here.
            </p>
          </div>
        ) : (
          <div className="scroll-area">
            {/* ---- Summary strip ---- */}
            {turnTrace && (
              <SummaryStrip turnTrace={turnTrace} nextAction={nextAction} />
            )}

            {showJson ? (
              /* ---- Raw JSON view ---- */
              <div className="card" style={{ padding: 'var(--space-4)' }}>
                <pre
                  id="trace-json-view"
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-secondary)',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0,
                  }}
                  aria-label="Raw trace JSON"
                >
                  {JSON.stringify({ turnId: context?.turnId, trace }, null, 2)}
                </pre>
              </div>
            ) : (
              <>
                {/* ---- Plain-language summary ---- */}
                <PlainLanguageView lines={plainLines} />

                {/* ---- Node timeline ---- */}
                <TraceTimeline steps={trace} studentLang={lang} />
              </>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
