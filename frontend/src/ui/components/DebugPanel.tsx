// ============================================================
// DebugPanel — visible when ?debug=1 or VITE_DEBUG_PANEL=true
// Phase 5 (MR-40, MR-42, MR-80) debug controls
// ============================================================
import React, { useEffect, useState } from 'react';
import { useAgentStore }    from '../../stores/agentStore';
import { useNetworkStore }  from '../../stores/networkStore';
import { useStorageStore }  from '../../stores/storageStore';
import { useProfileStore }  from '../../stores/profileStore';
import { checkStorageBudget, getLastStorageStatus } from '../../storage/storageMonitor';

interface StorageInfo {
  usageBytes: number;
  quotaBytes: number;
  usageFraction: number;
  persisted: boolean;
  warning: boolean;
}

function fmt(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function DebugPanel() {
  const { setScreen, context }              = useAgentStore();
  const { status, setStatus }               = useNetworkStore();
  const { isWarning, setWarning }           = useStorageStore();
  const { activeProfile }                   = useProfileStore();
  const [storageInfo, setStorageInfo]       = useState<StorageInfo | null>(null);
  const [expanded, setExpanded]             = useState(false);

  useEffect(() => {
    const s = getLastStorageStatus();
    setStorageInfo(s);
  }, []);

  async function refreshStorage() {
    const s = await checkStorageBudget();
    setStorageInfo(s);
  }

  function toggleOffline() {
    setStatus(status === 'OFFLINE' ? 'ONLINE' : 'OFFLINE');
  }

  function forceStorageWarning() {
    setWarning(true);
  }

  function forceUpdateBanner() {
    window.dispatchEvent(new CustomEvent('sathi:updateReady'));
  }

  if (!expanded) {
    return (
      <div
        id="debug-panel-collapsed"
        style={{
          position: 'fixed',
          bottom: 'var(--space-4)',
          right: 'var(--space-4)',
          zIndex: 9999,
        }}
      >
        <button
          id="debug-panel-toggle"
          onClick={() => setExpanded(true)}
          style={{
            background: 'rgba(124, 111, 255, 0.9)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 44,
            height: 44,
            fontSize: '1.2rem',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
          }}
          title="Open Debug Panel"
          aria-label="Open debug panel"
        >
          🐛
        </button>
      </div>
    );
  }

  const trace = context?.trace ?? [];

  return (
    <div
      id="debug-panel"
      role="complementary"
      aria-label="Debug panel"
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: 320,
        maxHeight: '80vh',
        overflowY: 'auto',
        background: 'rgba(15,17,23,0.97)',
        border: '1px solid var(--primary)',
        borderRadius: '12px 0 0 0',
        padding: 'var(--space-4)',
        zIndex: 9999,
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        boxShadow: '0 -4px 24px rgba(124,111,255,0.3)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>🐛 SATHI Debug</span>
        <button id="debug-panel-close" onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
      </div>

      {/* ---- Status info ---- */}
      <section style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{ color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>STATUS</div>
        <div>Network: <strong style={{ color: status === 'OFFLINE' ? 'var(--error)' : 'var(--success)' }}>{status}</strong></div>
        <div>Profile: <strong>{activeProfile?.nickname ?? '(none)'}</strong></div>
        <div>Turn: <strong>{context?.turnId ?? '(none)'}</strong></div>
        <div>Trace steps: <strong>{trace.length}</strong></div>
        <div>Storage warn: <strong style={{ color: isWarning ? 'var(--warning)' : 'var(--success)' }}>{isWarning ? '⚠️ Yes' : '—'}</strong></div>
      </section>

      {/* ---- Storage ---- */}
      <section style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{ color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>STORAGE (MR-40 / MR-41)</div>
        {storageInfo ? (
          <>
            <div>Usage: <strong>{fmt(storageInfo.usageBytes)}</strong> / {fmt(storageInfo.quotaBytes)}</div>
            <div>
              Fraction:{' '}
              <strong style={{ color: storageInfo.warning ? 'var(--error)' : 'var(--success)' }}>
                {(storageInfo.usageFraction * 100).toFixed(1)}%
              </strong>
              {storageInfo.usageFraction < 0.25 / 1024 && (
                <span style={{ color: 'var(--success)', marginLeft: 4 }}>(&lt;25 MB ✅)</span>
              )}
            </div>
            <div>Persisted: <strong>{storageInfo.persisted ? '✅ Yes' : '❌ No'}</strong></div>
          </>
        ) : (
          <div>Loading…</div>
        )}
        <button id="debug-refresh-storage" onClick={refreshStorage} style={btnStyle}>
          🔄 Refresh estimate
        </button>
      </section>

      {/* ---- Controls ---- */}
      <section style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{ color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>CONTROLS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button id="debug-toggle-offline" onClick={toggleOffline} style={btnStyle}>
            {status === 'OFFLINE' ? '🌐 Force Online' : '📴 Force Offline'}
          </button>
          <button id="debug-force-storage-warning" onClick={forceStorageWarning} style={btnStyle}>
            ⚠️ Force Storage Warning (MR-40)
          </button>
          <button id="debug-force-update-banner" onClick={forceUpdateBanner} style={btnStyle}>
            🔔 Force Update Banner (MR-42)
          </button>
          <button id="debug-view-trace" onClick={() => setScreen('trace')} style={btnStyle}>
            🔬 View Trace
          </button>
          <button id="debug-view-gaps" onClick={() => setScreen('gaps')} style={btnStyle}>
            📊 View Gap Viz
          </button>
        </div>
      </section>

      {/* ---- Raw trace JSON ---- */}
      {trace.length > 0 && (
        <section>
          <div style={{ color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>TRACE JSON</div>
          <pre
            id="debug-trace-json"
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-secondary)',
              overflowX: 'auto',
              maxHeight: 200,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 6,
              padding: 8,
              margin: 0,
            }}
          >
            {JSON.stringify(trace, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(124,111,255,0.15)',
  border: '1px solid rgba(124,111,255,0.3)',
  color: 'var(--primary)',
  borderRadius: 6,
  padding: '4px 10px',
  cursor: 'pointer',
  fontSize: '0.75rem',
  textAlign: 'left',
};
