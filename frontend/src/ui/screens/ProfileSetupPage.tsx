// ProfileSetupPage — /setup
// Class (1-12), Language, Board, Subjects — large tap chips
import React, { useState } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { useProfileStore } from '../../stores/profileStore';
import { NetworkBadge } from '../components/NetworkBadge';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { LangCode } from '../../types';

const AVATARS = ['🌻', '🦁', '🐬', '🦋', '🌈', '🚀', '🎸', '🦉', '🌺', '⚡', '🐉', '🌙'];
const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
];
const BOARDS = ['BSE-Odisha', 'CBSE', 'ICSE', 'State Board'];
const CLASSES = Array.from({ length: 12 }, (_, i) => i + 1);

export function ProfileSetupPage() {
  const { setScreen } = useAgentStore();
  const { setActiveProfile, profiles, setProfiles, setLanguage } = useProfileStore();

  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [classNum, setClassNum] = useState<number | null>(null);
  const [language, setLang] = useState<LangCode>('en');
  const [board, setBoard] = useState(BOARDS[0]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'name' | 'class' | 'lang' | 'board'>('name');

  const isEarlyGrade = classNum !== null && classNum <= 3;
  const tapMin = isEarlyGrade ? 'var(--tap-early)' : 'var(--tap-min)';

  async function handleSave() {
    if (!nickname.trim() || !classNum) return;
    setSaving(true);
    try {
      const { createProfile } = await import('../../profiles/profileManager');
      const profile = await createProfile({ nickname, avatar, class: classNum!, language, board });
      setProfiles([...profiles, profile]);
      setActiveProfile(profile);
      setLanguage(language);
      setScreen('study-time');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const canProceed =
    (step === 'name' && nickname.trim().length > 0) ||
    (step === 'class' && classNum !== null) ||
    step === 'lang' ||
    step === 'board';

  return (
    <ErrorBoundary>
      <div className="screen fade-in">
        <NetworkBadge />

        <div className="screen-header">
          <button
            className="icon-btn"
            onClick={() => step === 'name' ? setScreen('profile-picker') : setStep(
              step === 'class' ? 'name' : step === 'lang' ? 'class' : 'lang'
            )}
            aria-label="Go back"
          >
            ←
          </button>
          <h1 className="screen-title">New Profile</h1>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-8" aria-label="Setup progress">
          {(['name', 'class', 'lang', 'board'] as const).map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1, height: 4, borderRadius: 2,
                background: ['name', 'class', 'lang', 'board'].indexOf(step) >= i
                  ? 'var(--primary)' : 'var(--border)',
                transition: 'background 300ms',
              }}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="scroll-area">
          {/* Step 1: Name & Avatar */}
          {step === 'name' && (
            <div className="slide-up">
              <h2 style={{ marginBottom: 'var(--space-2)' }}>What's your name?</h2>
              <p className="text-secondary mb-6">Choose a nickname and avatar</p>

              <input
                id="profile-nickname"
                className="input mb-6"
                placeholder="Your nickname…"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                maxLength={20}
                autoFocus
                aria-label="Nickname"
                style={{ fontSize: 'var(--text-lg)', fontWeight: 600, textAlign: 'center' }}
              />

              <div className="grid-3 gap-3 stagger">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    id={`avatar-${a}`}
                    className={`card interactive flex-center${avatar === a ? '' : ''}`}
                    onClick={() => setAvatar(a)}
                    aria-pressed={avatar === a}
                    aria-label={`Avatar: ${a}`}
                    style={{
                      fontSize: '2rem', minHeight: 64, padding: 'var(--space-3)',
                      borderColor: avatar === a ? 'var(--primary)' : undefined,
                      background: avatar === a ? 'var(--primary-dim)' : undefined,
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Class */}
          {step === 'class' && (
            <div className="slide-up">
              <h2 style={{ marginBottom: 'var(--space-2)' }}>Which class?</h2>
              <p className="text-secondary mb-6">Select your class (1–12)</p>
              <div className="grid-3 stagger">
                {CLASSES.map((c) => (
                  <button
                    key={c}
                    id={`class-${c}`}
                    className={`card interactive flex-center${classNum === c ? '' : ''}`}
                    onClick={() => setClassNum(c)}
                    aria-pressed={classNum === c}
                    aria-label={`Class ${c}`}
                    style={{
                      minHeight: tapMin, fontSize: 'var(--text-xl)', fontWeight: 700,
                      borderColor: classNum === c ? 'var(--primary)' : undefined,
                      background: classNum === c ? 'var(--primary-dim)' : undefined,
                      color: classNum === c ? 'var(--primary)' : 'var(--text-primary)',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {classNum && classNum <= 3 && (
                <div className="banner banner-info mt-4" role="status">
                  <span aria-hidden="true">ℹ️</span>
                  Early-grade mode: larger buttons and icon labels enabled.
                </div>
              )}
            </div>
          )}

          {/* Step 3: Language */}
          {step === 'lang' && (
            <div className="slide-up">
              <h2 style={{ marginBottom: 'var(--space-2)' }}>Choose your language</h2>
              <p className="text-secondary mb-6">SATHI will teach in this language</p>
              <div className="flex-col gap-4 stagger">
                {LANGUAGES.map(({ code, label, native }) => (
                  <button
                    key={code}
                    id={`lang-${code}`}
                    className="card interactive"
                    onClick={() => setLang(code)}
                    aria-pressed={language === code}
                    aria-label={`${label} — ${native}`}
                    style={{
                      minHeight: tapMin, padding: 'var(--space-5)',
                      borderColor: language === code ? 'var(--primary)' : undefined,
                      background: language === code ? 'var(--primary-dim)' : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{label}</div>
                        <div className="text-muted text-sm">{native}</div>
                      </div>
                      {language === code && <span aria-hidden="true" style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>✓</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Board */}
          {step === 'board' && (
            <div className="slide-up">
              <h2 style={{ marginBottom: 'var(--space-2)' }}>Which board?</h2>
              <p className="text-secondary mb-6">Select your curriculum board</p>
              <div className="flex-col gap-4 stagger">
                {BOARDS.map((b) => (
                  <button
                    key={b}
                    id={`board-${b.replace(/\s/g, '-')}`}
                    className="card interactive"
                    onClick={() => setBoard(b)}
                    aria-pressed={board === b}
                    style={{
                      minHeight: tapMin, padding: 'var(--space-5)',
                      borderColor: board === b ? 'var(--primary)' : undefined,
                      background: board === b ? 'var(--primary-dim)' : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{b}</span>
                      {board === b && <span aria-hidden="true" style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>✓</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="bottom-action">
          {step !== 'board' ? (
            <button
              id="profile-next-btn"
              className="btn btn-primary btn-full btn-lg"
              disabled={!canProceed}
              onClick={() => setStep(step === 'name' ? 'class' : step === 'class' ? 'lang' : 'board')}
              aria-label="Next step"
            >
              Next →
            </button>
          ) : (
            <button
              id="profile-save-btn"
              className="btn btn-primary btn-full btn-lg"
              onClick={handleSave}
              disabled={saving || !nickname.trim() || !classNum}
              aria-busy={saving}
              aria-label="Create profile and start learning"
            >
              {saving ? <><div className="spinner" aria-hidden="true" /> Creating…</> : `🚀 Start learning as ${nickname || 'you'}`}
            </button>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
