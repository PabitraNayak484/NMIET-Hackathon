// NextActionCard — shows agent's next recommended action with a large CTA button
import React from 'react';
import type { PlanResult, Action } from '../../types';
import { useAgentStore } from '../../stores/agentStore';

const ACTION_CONFIG: Record<Action, { emoji: string; label: string; description: string }> = {
  explain:             { emoji: '📖', label: 'Explanation',  description: 'SATHI will explain this concept' },
  give_example:        { emoji: '💡', label: 'Example',      description: 'SATHI will show a real-life example' },
  revise_prerequisite: { emoji: '🔙', label: 'Prerequisite', description: 'Let\'s build the foundation first' },
  practice:            { emoji: '✏️', label: 'Practice',     description: 'A quick practice exercise' },
  quiz:                { emoji: '🎯', label: 'Quiz',         description: 'Test your understanding' },
  review:              { emoji: '🔄', label: 'Review',       description: 'Let\'s revisit what you know' },
  continue:            { emoji: '▶️', label: 'Continue',     description: 'Carry on from where you left off' },
  teacher_escalation:  { emoji: '👩‍🏫', label: 'Ask Teacher',  description: 'This question has been saved for your teacher' },
};

interface Props {
  plan: PlanResult;
  onContinue: () => void;
  loading?: boolean;
}

export function NextActionCard({ plan, onContinue, loading = false }: Props) {
  const { action, reason, ruleId } = plan;
  const cfg = ACTION_CONFIG[action] ?? ACTION_CONFIG.continue;

  return (
    <div className="card slide-up" style={{ borderColor: 'var(--primary)', borderWidth: 2 }}>
      <div className="flex items-center gap-4 mb-4">
        <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">{cfg.emoji}</div>
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cfg.label}</span>
            <span
              className="badge badge-primary"
              title={`Planner rule ${ruleId}`}
              aria-label={`Next step: ${cfg.label}`}
            >
              Next step
            </span>
          </div>
          <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
            {cfg.description}
          </p>
        </div>
      </div>

      {reason && (
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
          }}
          aria-label={`Reason: ${reason}`}
        >
          💬 {reason}
        </div>
      )}

      <button
        id="next-action-btn"
        className="btn btn-primary btn-full btn-lg"
        onClick={onContinue}
        disabled={loading}
        aria-busy={loading}
        aria-label={`Start: ${cfg.label}`}
      >
        {loading ? (
          <><div className="spinner" aria-hidden="true" /> Working…</>
        ) : (
          <>{cfg.emoji} {cfg.label} →</>
        )}
      </button>
    </div>
  );
}
