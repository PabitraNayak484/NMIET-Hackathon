// TraceTimeline — collapsible agent trace as vertical timeline
import React, { useState } from 'react';
import type { TraceStep } from '../../types';

const NODE_EMOJI: Record<string, string> = {
  UNDERSTAND:   '🧠',
  INSPECT_STATE:'🔍',
  PLAN:         '📋',
  RETRIEVE:     '📚',
  TEACH:        '📖',
  ASSESS:       '🎯',
  EVALUATE:     '✅',
  UPDATE_STATE: '💾',
  ACT_NEXT:     '▶️',
};

interface Props {
  steps: TraceStep[];
  studentLang?: string;
}

export function TraceTimeline({ steps, studentLang = 'en' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showJSON, setShowJSON] = useState(false);

  const summary = `${steps.length} steps · ${steps.filter(s => s.tool).length} tools used`;

  return (
    <div className="card">
      {/* Collapsed header */}
      <button
        className="flex items-center justify-between w-full"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-primary)' }}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`Decision trace — ${summary}. Tap to ${expanded ? 'collapse' : 'expand'}`}
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true">🔬</span>
          <div>
            <div style={{ fontWeight: 700 }}>Decision Trace</div>
            <div className="text-muted text-xs">{summary}</div>
          </div>
        </div>
        <span aria-hidden="true" style={{ fontSize: '1.2rem', transition: 'transform 200ms', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>

      {expanded && (
        <div className="slide-up" style={{ marginTop: 'var(--space-5)' }}>
          {/* Timeline */}
          <div className="flex-col gap-0">
            {steps.map((step, i) => (
              <div className="trace-step" key={i}>
                <div className="trace-dot" aria-hidden="true">
                  {NODE_EMOJI[step.node] ?? '⚙️'}
                </div>
                <div className="trace-content">
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {step.node}
                    {step.durationMs && (
                      <span className="text-muted text-xs" style={{ marginLeft: 8 }}>
                        {step.durationMs}ms
                      </span>
                    )}
                  </div>
                  {step.tool && (
                    <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: 4 }}>
                      {(Array.isArray(step.tool) ? step.tool : [step.tool]).map((t) => (
                        <span className="badge badge-primary" key={t}>{t}</span>
                      ))}
                    </div>
                  )}
                  {step.action && (
                    <div className="badge badge-accent" style={{ marginBottom: 4 }}>→ {step.action}</div>
                  )}
                  {step.reason && (
                    <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
                      {step.reason}
                    </p>
                  )}
                  {step.error && (
                    <p style={{ color: 'var(--error)', fontSize: 'var(--text-xs)', margin: 0 }}>
                      ⚠️ {step.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* JSON toggle */}
          <button
            className="btn btn-ghost btn-sm mt-4"
            onClick={() => setShowJSON((v) => !v)}
            aria-expanded={showJSON}
            aria-label={showJSON ? 'Hide technical JSON view' : 'Show technical JSON view'}
          >
            {showJSON ? 'Hide technical view' : 'Show technical view'}
          </button>

          {showJSON && (
            <pre
              className="mt-4"
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                overflow: 'auto',
                maxHeight: 300,
                fontFamily: 'var(--font-mono)',
              }}
              aria-label="Raw JSON trace data"
            >
              {JSON.stringify(steps, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
