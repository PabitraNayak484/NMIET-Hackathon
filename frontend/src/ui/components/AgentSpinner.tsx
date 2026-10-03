// AgentSpinner — "SATHI is thinking…" with ARIA live region (MR-70)
import React from 'react';

interface Props {
  message?: string;
  large?: boolean;
}

export function AgentSpinner({ message = 'SATHI is thinking…', large = false }: Props) {
  return (
    <div
      className="flex-center flex-col gap-4"
      style={{ padding: 'var(--space-8)', minHeight: 160 }}
      aria-live="polite"
      aria-label={message}
      role="status"
    >
      <div className={large ? 'spinner spinner-lg' : 'spinner'} aria-hidden="true" />
      <p className="text-secondary text-sm" style={{ margin: 0, fontWeight: 500, letterSpacing: 0.3 }}>
        {message}
      </p>
    </div>
  );
}
