// SettingsPage — /settings
// Language switcher, text size, clear data per profile / all, offline status, version
// MR-04, MR-71
import React, { useState } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { useProfileStore } from '../../stores/profileStore';
import { useNetworkStore } from '../../stores/networkStore';
import { useStorageStore } from '../../stores/storageStore';
import { NetworkBadge } from '../components/NetworkBadge';
import { TextSizeControl } from '../components/TextSizeControl';
import { StorageWarningBanner } from '../components/StorageWarningBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { LangCode } from '../../types';

const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
];

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export function SettingsPage() {
  const { setScreen } = useAgentStore();
  const { activeProfile, language, setLanguage } = useProfileStore();
  const { status: netStatus, pendingSyncCount } = useNetworkStore();
  const { usageBytes, quotaBytes, isPersisted } = useStorageStore();
  const [confirmClearProfile, setConfirmClearProfile] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleClearProfile() {
    if (!activeProfile) return;
    setClearing(true);
    try {
      const { clearProfileData } = await import('../../profiles/profileManager');
      await clearProfileData(activeProfile.profile_id);
      setConfirmClearProfile(false);
    } catch (e) {
      console.error(e);
    } finally {
      setClearing(false);
    }
  }

  async function handleClearAll() {
    setClearing(true);
    try {
      const { clearAllProfilesData } = await import('../../profiles/profileManager');
      await clearAllProfilesData();
      setConfirmClearAll(false);
      setScreen('profile-picker');
    } catch (e) {
      console.error(e);
    } finally {
      setClearing(false);
    }
  }

  async function handlePruneOldData() {
    try {
      const { deleteEventsForProfile } = await import('../../db/repo');
      // Prune events older than 30 days that have been synced
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      console.log('[SATHI] Would prune events older than', cutoff);
      // Note: full prune not yet implemented in repo
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <ErrorBoundary>
      <div className="screen fade-in">
        <NetworkBadge />

        <div className="screen-header">
          <button className="icon-btn" onClick={() => setScreen('home')} aria-label="Back to home">←</button>
          <h1 className="screen-title">Settings</h1>
        </div>

        <StorageWarningBanner onClear={handlePruneOldData} />

        <div className="scroll-area flex-col gap-6">
          {/* Profile info */}
          {activeProfile && (
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="avatar" style={{ width: 52, height: 52, fontSize: '1.8rem', border: '2px solid var(--primary)' }}>
                  {activeProfile.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{activeProfile.nickname}</div>
                  <div className="text-secondary text-sm">
                    Class {activeProfile.class} · {activeProfile.board}
                  </div>
                </div>
                <button
                  id="switch-profile-btn"
                  className="btn btn-ghost btn-sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => setScreen('profile-picker')}
                  aria-label="Switch profile"
                >
                  Switch
                </button>
              </div>
            </div>
          )}

          {/* Language */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>
              🌐 Language
            </h3>
            <div className="flex gap-2" role="group" aria-label="Select language">
              {LANGUAGES.map(({ code, label, native }) => (
                <button
                  key={code}
                  id={`lang-setting-${code}`}
                  className={`chip${language === code ? ' active' : ''}`}
                  onClick={() => setLanguage(code)}
                  aria-pressed={language === code}
                  aria-label={`${label} — ${native}`}
                  style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 2, minHeight: 52 }}
                >
                  <span style={{ fontSize: 'var(--text-xs)' }}>{native}</span>
                  <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text size (MR-71) */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>
              🔤 Text size
            </h3>
            <TextSizeControl />
          </div>

          {/* Network & Sync status */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', fontWeight: 600 }}>
              📡 Network
            </h3>
            <div className="flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-secondary text-sm">Status</span>
                <span className={`badge ${netStatus === 'ONLINE' ? 'badge-success' : netStatus === 'OFFLINE' ? 'badge-error' : 'badge-warning'}`}>
                  {netStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary text-sm">Events to sync</span>
                <span className="badge badge-primary">{pendingSyncCount}</span>
              </div>
            </div>
          </div>

          {/* Storage (MR-40, MR-41) */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', fontWeight: 600 }}>
              💾 Storage
            </h3>
            <div className="flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-secondary text-sm">Persisted storage</span>
                <span className={`badge ${isPersisted ? 'badge-success' : 'badge-warning'}`}>
                  {isPersisted ? '✅ Locked' : '⚠️ Not guaranteed'}
                </span>
              </div>
              {quotaBytes > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-secondary text-sm">Used / Available</span>
                  <span className="text-muted text-xs">
                    {formatMB(usageBytes)} / {formatMB(quotaBytes)}
                  </span>
                </div>
              )}
            </div>
            <button
              className="btn btn-ghost btn-sm btn-full mt-4"
              onClick={handlePruneOldData}
              aria-label="Clear old synced data (older than 30 days)"
            >
              🧹 Clear old data (30+ days)
            </button>
          </div>

          {/* Clear data (MR-04) */}
          <div className="card" style={{ borderColor: 'rgba(255,107,107,0.3)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--error)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>
              ⚠️ Data Management
            </h3>

            {/* Clear profile */}
            {confirmClearProfile ? (
              <div className="card mb-4" style={{ borderColor: 'var(--error)' }}>
                <p style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                  Clear all progress for <strong>{activeProfile?.nickname}</strong>? This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button className="btn btn-danger btn-sm" onClick={handleClearProfile} disabled={clearing}>
                    {clearing ? <><div className="spinner" /> Clearing…</> : 'Yes, clear'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClearProfile(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button
                id="clear-profile-data-btn"
                className="btn btn-danger btn-full mb-3"
                onClick={() => setConfirmClearProfile(true)}
                aria-label={`Clear ${activeProfile?.nickname}'s progress data`}
              >
                🗑 Clear {activeProfile?.nickname ?? 'profile'}'s data
              </button>
            )}

            {/* Clear all */}
            {confirmClearAll ? (
              <div className="card" style={{ borderColor: 'var(--error)' }}>
                <p style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                  Delete ALL profiles and ALL data from this device? This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button className="btn btn-danger btn-sm" onClick={handleClearAll} disabled={clearing}>
                    {clearing ? <><div className="spinner" /> Clearing…</> : 'Yes, delete all'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClearAll(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button
                id="clear-all-data-btn"
                className="btn btn-ghost btn-full"
                onClick={() => setConfirmClearAll(true)}
                style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                aria-label="Delete all profiles and data from this device"
              >
                💥 Delete all data
              </button>
            )}
          </div>

          {/* Version */}
          <div className="text-center text-muted text-xs" style={{ padding: 'var(--space-4)' }}>
            SATHI v1.0.0 · Offline-first · PWA
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
