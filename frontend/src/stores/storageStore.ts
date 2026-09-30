// SATHI — Zustand storage store (MR-40, MR-41)
// Tracks storage persistence status, usage estimate, and warning flag

import { create } from 'zustand';

interface StorageStore {
  isPersisted: boolean;
  setIsPersisted: (v: boolean) => void;

  usageBytes: number;
  quotaBytes: number;
  setEstimate: (usage: number, quota: number) => void;

  isWarning: boolean;
  setWarning: (v: boolean) => void;
}

export const useStorageStore = create<StorageStore>((set) => ({
  isPersisted: false,
  setIsPersisted: (isPersisted) => set({ isPersisted }),

  usageBytes: 0,
  quotaBytes: 0,
  setEstimate: (usageBytes, quotaBytes) => set({ usageBytes, quotaBytes }),

  isWarning: false,
  setWarning: (isWarning) => set({ isWarning }),
}));
