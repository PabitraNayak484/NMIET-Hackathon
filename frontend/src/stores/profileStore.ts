// SATHI — Zustand profile store
// Active profile + list of all profiles

import { create } from 'zustand';
import type { ProfileRecord, LangCode } from '../types';

interface ProfileStore {
  activeProfile: ProfileRecord | null;
  setActiveProfile: (p: ProfileRecord | null) => void;

  profiles: ProfileRecord[];
  setProfiles: (ps: ProfileRecord[]) => void;

  language: LangCode;
  setLanguage: (l: LangCode) => void;

  textSizeLevel: 1 | 2 | 3;
  setTextSizeLevel: (l: 1 | 2 | 3) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  activeProfile: null,
  setActiveProfile: (activeProfile) => set({ activeProfile }),

  profiles: [],
  setProfiles: (profiles) => set({ profiles }),

  language: 'en',
  setLanguage: (language) => set({ language }),

  textSizeLevel: 2,
  setTextSizeLevel: (textSizeLevel) => set({ textSizeLevel }),
}));
