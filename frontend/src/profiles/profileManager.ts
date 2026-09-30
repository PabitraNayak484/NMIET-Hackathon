// ============================================================
// Profile Manager — multi-profile support (MR-01, MR-02, MR-04)
// Up to 5 profiles can coexist on one device.
// Data for each profile is fully isolated in IndexedDB.
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import {
  listProfiles, upsertProfileRecord, deleteProfileRecord, getProfileRecord,
  deleteLearningStateForProfile, deleteEventsForProfile,
  deleteQuizSeenForProfile, clearAllResumeStatesForProfile,
  getMeta, setMeta,
} from '../db/repo';
import type { ProfileRecord, LangCode } from '../types';

export const MAX_PROFILES = 5;
const ACTIVE_PROFILE_KEY = 'active_profile_id';

// ---- Read ---------------------------------------------------

export async function getProfiles(): Promise<ProfileRecord[]> {
  return listProfiles();
}

export async function getActiveProfileId(): Promise<string | null> {
  return (await getMeta(ACTIVE_PROFILE_KEY)) ?? null;
}

export async function getActiveProfile(): Promise<ProfileRecord | null> {
  const id = await getActiveProfileId();
  if (!id) return null;
  return (await getProfileRecord(id)) ?? null;
}

// ---- Create -------------------------------------------------

export interface CreateProfileInput {
  nickname: string;
  avatar: string;
  class: number;
  language: LangCode;
  board: string;
}

/**
 * Creates a new profile and sets it as active.
 * Throws if MAX_PROFILES is already reached.
 */
export async function createProfile(input: CreateProfileInput): Promise<ProfileRecord> {
  const existing = await listProfiles();
  if (existing.length >= MAX_PROFILES) {
    throw new Error(`Cannot create more than ${MAX_PROFILES} profiles on one device.`);
  }

  const profile: ProfileRecord = {
    profile_id: uuidv4(),
    nickname:   input.nickname.trim().slice(0, 20),
    avatar:     input.avatar,
    class:      input.class,
    language:   input.language,
    board:      input.board,
    created_at: new Date().toISOString(),
  };

  await upsertProfileRecord(profile);
  await setMeta(ACTIVE_PROFILE_KEY, profile.profile_id);
  return profile;
}

// ---- Switch -------------------------------------------------

/** Sets a profile as active.  Two-tap switch (MR-02). */
export async function switchProfile(profile_id: string): Promise<void> {
  const p = await getProfileRecord(profile_id);
  if (!p) throw new Error(`Profile not found: ${profile_id}`);
  await setMeta(ACTIVE_PROFILE_KEY, profile_id);
}

// ---- Update -------------------------------------------------

export async function updateProfileNickname(
  profile_id: string,
  nickname: string
): Promise<void> {
  const p = await getProfileRecord(profile_id);
  if (!p) throw new Error(`Profile not found: ${profile_id}`);
  await upsertProfileRecord({ ...p, nickname: nickname.trim().slice(0, 20) });
}

// ---- Delete / Clear -----------------------------------------

/**
 * Clears ALL local data for a single profile (MR-04).
 * Other profiles' data is untouched.
 */
export async function clearProfileData(profile_id: string): Promise<void> {
  await Promise.all([
    deleteLearningStateForProfile(profile_id),
    deleteEventsForProfile(profile_id),
    deleteQuizSeenForProfile(profile_id),
    clearAllResumeStatesForProfile(profile_id),
  ]);
}

/**
 * Deletes a profile and all its data (MR-04).
 * If it was the active profile, switches to the first remaining profile.
 */
export async function deleteProfile(profile_id: string): Promise<void> {
  await clearProfileData(profile_id);
  await deleteProfileRecord(profile_id);

  const active = await getActiveProfileId();
  if (active === profile_id) {
    const remaining = await listProfiles();
    if (remaining.length > 0) {
      await setMeta(ACTIVE_PROFILE_KEY, remaining[0].profile_id);
    } else {
      await setMeta(ACTIVE_PROFILE_KEY, '');
    }
  }
}

/**
 * Clears data for ALL profiles (MR-04 — "clear all").
 * Profiles themselves are kept; only learner data is wiped.
 */
export async function clearAllProfilesData(): Promise<void> {
  const profiles = await listProfiles();
  await Promise.all(profiles.map(p => clearProfileData(p.profile_id)));
}
