// StorageWarningBanner — shown when storage > 80% of quota (MR-40)
import React from 'react';
import { useStorageStore } from '../../stores/storageStore';

interface Props {
  onClear?: () => void;
}

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export function StorageWarningBanner({ onClear }: Props) {
  const { isWarning, usageBytes, quotaBytes } = useStorageStore();
  if (!isWarning) return null;

  const pct = quotaBytes > 0 ? Math.round((usageBytes / quotaBytes) * 100) : 0;

  return (
    <div className="banner banner-warning" role="alert" aria-live="assertive">
      <span aria-hidden="true">⚠️</span>
      <span style={{ flex: 1 }}>
        Storage {pct}% full ({formatMB(usageBytes)} used). Old data may be lost.
      </span>
      {onClear && (
        <button
          className="btn btn-sm btn-ghost"
          onClick={onClear}
          style={{ flexShrink: 0, minHeight: 32 }}
          aria-label="Clear old synced data to free up space"
        >
          Clear old data
        </button>
      )}
    </div>
  );
}
