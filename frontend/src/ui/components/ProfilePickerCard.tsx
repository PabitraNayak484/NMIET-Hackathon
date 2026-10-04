// ProfilePickerCard — Reusable avatar + nickname card (MR-01, MR-02)
// 2-tap switch: first tap selects (highlights), second tap confirms (navigates).
// Wraps the inline card UI that was previously embedded in ProfilePickerPage.
import React, { useState } from 'react';
import type { ProfileRecord } from '../../types';

interface ProfilePickerCardProps {
  profile: ProfileRecord;
  /** Called when the user confirms selection (second tap or single-tap if singleTap=true) */
  onSelect: (profile: ProfileRecord) => void;
  /** Called when the delete button is clicked */
  onDeleteRequest: (profileId: string) => void;
  /** If true, a single tap confirms immediately (no two-tap confirmation) */
  singleTap?: boolean;
}

/**
 * ProfilePickerCard
 *
 * Renders a single profile entry with avatar, nickname, class/language/board info,
 * and a delete trigger. Implements the 2-tap-switch pattern (MR-02):
 *   - Tap 1: card enters "confirm" state (highlighted ring + confirm hint).
 *   - Tap 2: calls onSelect.
 *   - Clicking away or pressing Escape resets to idle.
 *
 * Set singleTap=true for contexts where a two-tap flow would be confusing
 * (e.g., when there is only one profile on the device).
 */
export function ProfilePickerCard({
  profile,
  onSelect,
  onDeleteRequest,
  singleTap = false,
}: ProfilePickerCardProps) {
  const [pendingConfirm, setPendingConfirm] = useState(false);

  function handleCardClick() {
    if (singleTap) {
      onSelect(profile);
      return;
    }
    if (pendingConfirm) {
      // Second tap — confirm
      onSelect(profile);
    } else {
      // First tap — highlight
      setPendingConfirm(true);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setPendingConfirm(false);
  }

  return (
    <div
      style={{ position: 'relative' }}
      onBlur={(e) => {
        // Reset if focus leaves the card entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setPendingConfirm(false);
        }
      }}
    >
      <button
        id={`profile-card-${profile.profile_id}`}
        className="card interactive slide-up w-full"
        style={{
          textAlign: 'left',
          padding: 'var(--space-4) var(--space-5)',
          outline: pendingConfirm ? '2px solid var(--primary)' : undefined,
          outlineOffset: '2px',
          transition: 'outline 0.15s ease',
        }}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        aria-label={
          pendingConfirm
            ? `Confirm: switch to ${profile.nickname}, Class ${profile.class}`
            : `Select profile: ${profile.nickname}, Class ${profile.class}`
        }
        aria-pressed={pendingConfirm}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="avatar"
            style={{
              width: 52,
              height: 52,
              fontSize: '1.8rem',
              border: `2px solid ${pendingConfirm ? 'var(--accent)' : 'var(--primary)'}`,
              transition: 'border-color 0.15s ease',
            }}
            aria-hidden="true"
          >
            {profile.avatar}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>
              {profile.nickname}
            </div>
            <div className="text-secondary text-sm">
              Class {profile.class} · {profile.language.toUpperCase()} · {profile.board}
            </div>

            {/* Confirm hint (tap-2 state) */}
            {pendingConfirm && (
              <div
                style={{
                  marginTop: 'var(--space-1)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  animation: 'fadeIn 0.15s ease',
                }}
                aria-live="polite"
              >
                Tap again to switch →
              </div>
            )}
          </div>

          {/* Chevron */}
          <span
            aria-hidden="true"
            style={{
              color: pendingConfirm ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '1.2rem',
              transition: 'color 0.15s ease',
            }}
          >
            ›
          </span>
        </div>
      </button>

      {/* Delete button — visible when not in confirm state */}
      {!pendingConfirm && (
        <button
          className="icon-btn"
          style={{
            position: 'absolute',
            top: '50%',
            right: 'var(--space-12)',
            transform: 'translateY(-50%)',
            width: 32,
            height: 32,
            fontSize: '0.9rem',
            opacity: 0.5,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(profile.profile_id);
          }}
          aria-label={`Delete ${profile.nickname}'s profile`}
          tabIndex={0}
        >
          🗑
        </button>
      )}
    </div>
  );
}
