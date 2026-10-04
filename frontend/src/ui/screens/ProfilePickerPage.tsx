import React, { useEffect, useState } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { useProfileStore } from '../../stores/profileStore';
import { NetworkBadge } from '../components/NetworkBadge';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ProfilePickerCard } from '../components/ProfilePickerCard';
import { useDemoSeed } from '../../profiles/useDemoSeed';
import { getProfiles, deleteProfile } from '../../profiles/profileManager';
import type { ProfileRecord } from '../../types';

const AVATARS = ['🌻', '🦁', '🐬', '🦋', '🌈', '🚀', '🎸', '🦉', '🌺', '⚡'];

export function ProfilePickerPage() {
  const { setScreen } = useAgentStore();
  const { profiles, setProfiles, setActiveProfile } = useProfileStore();
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { seedDemo, seeding } = useDemoSeed();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const ps = await Promise.race([
          getProfiles(),
          new Promise<ProfileRecord[]>((_, reject) =>
            setTimeout(() => reject(new Error('Profile loading timed out')), 1500)
          ),
        ]);
        if (mounted) setProfiles(ps);
      } catch (e) {
        console.warn('[ProfilePicker] Error or timeout loading profiles:', e);
        if (mounted) setProfiles([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [setProfiles]);

  async function handleSelect(profile: ProfileRecord) {
    setActiveProfile(profile);
    setScreen('study-time');
  }

  async function handleAdd() {
    if (profiles.length >= 5) return;
    setScreen('profile-setup');
  }

  async function handleDelete(id: string) {
    try {
      await deleteProfile(id);
      setProfiles(profiles.filter((p) => p.profile_id !== id));
      setConfirmDelete(null);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <div className="screen flex-center" style={{ minHeight: '100dvh' }}>
        <div className="spinner spinner-lg" aria-label="Loading profiles" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="screen fade-in">
        <NetworkBadge />

        {/* Hero */}
        <div className="text-center" style={{ padding: 'var(--space-10) 0 var(--space-8)' }}>
          <div
            style={{
              width: 80, height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', margin: '0 auto var(--space-4)',
              boxShadow: 'var(--shadow-glow)',
            }}
            aria-hidden="true"
          >
            🎓
          </div>
          <h1 className="gradient-text" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>
            SATHI
          </h1>
          <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
            Smart AI Teaching and Helpful Intelligence
          </p>
        </div>

        {/* Profiles */}
        {profiles.length > 0 ? (
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
              Who's learning today?
            </h2>
            <div className="flex-col gap-3 stagger">
              {profiles.map((profile) => (
                <div key={profile.profile_id}>
                  {confirmDelete === profile.profile_id ? (
                    <div className="card" style={{ borderColor: 'var(--error)' }}>
                      <p style={{ marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
                        Delete <strong>{profile.nickname}</strong>'s profile and all their progress?
                      </p>
                      <div className="flex gap-3">
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(profile.profile_id)}>Delete</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <ProfilePickerCard
                      profile={profile}
                      onSelect={handleSelect}
                      onDeleteRequest={setConfirmDelete}
                      singleTap={profiles.length === 1}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card text-center" style={{ padding: 'var(--space-10)' }}>
            <div aria-hidden="true" style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>👋</div>
            <h3 style={{ marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>Welcome to SATHI!</h3>
            <p className="text-secondary" style={{ marginBottom: 'var(--space-6)' }}>Create your learning profile to get started.</p>

            {/* Demo seed button — Phase 6 */}
            <button
              id="load-demo-btn"
              className="btn btn-ghost"
              style={{ fontSize: 'var(--text-sm)', opacity: 0.75 }}
              disabled={seeding}
              onClick={async () => {
                const profile = await seedDemo();
                if (profile) {
                  const ps = await getProfiles();
                  setProfiles(ps);
                  setActiveProfile(profile);
                  setScreen('study-time');
                }
              }}
              aria-label="Load Priya demo profile"
            >
              {seeding ? '⏳ Loading…' : '🌻 Load Demo (Priya)'}
            </button>
          </div>
        )}

        {/* Add profile */}
        <div className="bottom-action">
          <button
            id="add-profile-btn"
            className="btn btn-primary btn-full btn-lg"
            onClick={handleAdd}
            disabled={profiles.length >= 5}
            aria-label={profiles.length >= 5 ? 'Maximum 5 profiles reached' : 'Add a new profile'}
          >
            <span aria-hidden="true">+</span>
            {profiles.length >= 5 ? 'Maximum 5 profiles' : 'Add profile'}
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
