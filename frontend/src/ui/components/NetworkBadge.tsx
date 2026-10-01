// NetworkBadge — always-visible, icon + text + colour (MR-72)
// ARIA live region so screen readers announce changes (MR-70)

import React from 'react';
import { useNetworkStore } from '../../stores/networkStore';
import type { NetworkStatus } from '../../types';

const CONFIG: Record<NetworkStatus, { icon: string; label: string; cls: string }> = {
  ONLINE:       { icon: '🟢', label: 'Online',       cls: 'badge-success' },
  OFFLINE:      { icon: '🔴', label: 'Offline',       cls: 'badge-error'   },
  RECONNECTING: { icon: '🟡', label: 'Reconnecting',  cls: 'badge-warning' },
  SYNCING:      { icon: '🔵', label: 'Syncing…',      cls: 'badge-primary' },
};

interface Props {
  fixed?: boolean;
}

export function NetworkBadge({ fixed = true }: Props) {
  const { status, pendingSyncCount } = useNetworkStore();
  const { icon, label, cls } = CONFIG[status];

  return (
    <div
      className={fixed ? 'network-badge-fixed' : undefined}
      aria-live="polite"
      aria-atomic="true"
      role="status"
      aria-label={`Network status: ${label}${pendingSyncCount > 0 ? `, ${pendingSyncCount} events pending sync` : ''}`}
    >
      <span className={`badge ${cls}`} style={{ gap: 6, fontSize: 'var(--text-xs)', padding: '4px 10px' }}>
        <span aria-hidden="true">{icon}</span>
        <span>{label}</span>
        {status === 'SYNCING' && pendingSyncCount > 0 && (
          <span>({pendingSyncCount})</span>
        )}
      </span>
    </div>
  );
}
