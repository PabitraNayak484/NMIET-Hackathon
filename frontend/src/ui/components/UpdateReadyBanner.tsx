// UpdateReadyBanner — shown only after session ends, never mid-quiz (MR-42)
import React from 'react';

interface Props {
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateReadyBanner({ onUpdate, onDismiss }: Props) {
  return (
    <div className="banner banner-info" role="status" aria-live="polite">
      <span aria-hidden="true">🔄</span>
      <span style={{ flex: 1 }}>
        A new version of SATHI is ready.
      </span>
      <div className="flex gap-2">
        <button
          className="btn btn-sm btn-primary"
          onClick={onUpdate}
          aria-label="Install update now"
          style={{ minHeight: 32 }}
        >
          Update
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={onDismiss}
          aria-label="Dismiss update notification"
          style={{ minHeight: 32 }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
