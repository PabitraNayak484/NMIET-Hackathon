// ErrorBoundary — catches crashes, shows localized error + retry (MR-70)
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SATHI ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="screen flex-center flex-col"
          style={{ gap: 'var(--space-6)', textAlign: 'center' }}
          role="alert"
          aria-live="assertive"
        >
          <div style={{ fontSize: '3rem' }} aria-hidden="true">😔</div>
          <div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Something went wrong
            </h2>
            <p className="text-secondary">
              SATHI ran into a problem. Your progress is saved offline.
            </p>
          </div>
          {this.state.error && (
            <code
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                background: 'var(--card)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                maxWidth: '100%',
                wordBreak: 'break-all',
              }}
            >
              {this.state.error.message}
            </code>
          )}
          <button
            className="btn btn-primary btn-lg"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            aria-label="Try again"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
