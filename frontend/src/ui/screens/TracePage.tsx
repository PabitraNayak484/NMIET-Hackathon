// TracePage — /trace
// Collapsed summary → timeline → JSON toggle
import React from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { NetworkBadge } from '../components/NetworkBadge';
import { TraceTimeline } from '../components/TraceTimeline';
import { ErrorBoundary } from '../components/ErrorBoundary';

export function TracePage() {
  const { setScreen, context } = useAgentStore();
  const trace = context?.trace ?? [];
  const lang = context?.profile?.language ?? 'en';

  const toolCount = trace.filter((s) => s.tool).length;
  const nextAction = context?.plan?.action ?? '—';

  return (
    <ErrorBoundary>
      <div className="screen fade-in">
        <NetworkBadge />

        <div className="screen-header">
          <button className="icon-btn" onClick={() => setScreen('home')} aria-label="Back to home">←</button>
          <h1 className="screen-title">Decision Trace</h1>
        </div>

        {/* Summary strip */}
        <div className="card mb-6" style={{ padding: 'var(--space-4) var(--space-5)' }}>
          <div className="grid-3" style={{ gap: 'var(--space-4)' }}>
            <div className="text-center">
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--primary)' }}>{trace.length}</div>
              <div className="text-muted text-xs">Steps</div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--accent)' }}>{toolCount}</div>
              <div className="text-muted text-xs">Tools</div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--success)' }}>
                {context?.network === 'OFFLINE' ? '📴' : '🌐'}
              </div>
              <div className="text-muted text-xs">{context?.network ?? 'Unknown'}</div>
            </div>
          </div>
          {nextAction !== '—' && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-muted text-xs">Next action:</span>
              <span className="badge badge-accent">{nextAction}</span>
            </div>
          )}
        </div>

        <div className="scroll-area">
          {trace.length === 0 ? (
            <div className="card text-center" style={{ padding: 'var(--space-10)' }}>
              <span aria-hidden="true" style={{ fontSize: '2.5rem' }}>🔬</span>
              <p className="text-secondary mt-4">
                No trace yet. Complete a learning session to see SATHI's decision process here.
              </p>
            </div>
          ) : (
            <TraceTimeline steps={trace} studentLang={lang} />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
