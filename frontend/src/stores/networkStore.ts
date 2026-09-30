// SATHI — Zustand network store
// 4-state machine: ONLINE → OFFLINE → RECONNECTING → SYNCING → ONLINE

import { create } from 'zustand';
import type { NetworkStatus } from '../types';

interface NetworkStore {
  status: NetworkStatus;
  setStatus: (s: NetworkStatus) => void;

  pendingSyncCount: number;
  setPendingSyncCount: (n: number) => void;

  isLLMAvailable: boolean;
  setLLMAvailable: (v: boolean) => void;

  isDataSaver: boolean;
  setDataSaver: (v: boolean) => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  status: 'OFFLINE',
  setStatus: (status) => set({ status }),

  pendingSyncCount: 0,
  setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),

  isLLMAvailable: false,
  setLLMAvailable: (isLLMAvailable) => set({ isLLMAvailable }),

  isDataSaver: false,
  setDataSaver: (isDataSaver) => set({ isDataSaver }),
}));
