// SATHI — Zustand agent store
// Manages current screen, agent context, and loading state

import { create } from 'zustand';
import type { AgentContext, AgentInput, NetworkStatus } from '../types';

type Screen =
  | 'profile-picker'
  | 'profile-setup'
  | 'study-time'
  | 'home'
  | 'ask'
  | 'explanation'
  | 'quiz'
  | 'feedback'
  | 'gaps'
  | 'trace'
  | 'settings';

interface AgentStore {
  // Navigation
  screen: Screen;
  setScreen: (s: Screen) => void;

  // Agent context
  context: AgentContext | null;
  setContext: (ctx: AgentContext) => void;
  clearContext: () => void;

  // Loading state
  loading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;

  // Error
  error: string | null;
  setError: (e: string | null) => void;

  // Network (for agent decisions)
  network: NetworkStatus;
  setNetwork: (n: NetworkStatus) => void;

  // Study time (MR-13)
  availableTimeMin: number | null;
  setAvailableTimeMin: (t: number | null) => void;

  // Active topic
  topicId: string | null;
  setTopicId: (id: string | null) => void;

  // Last agent input (for retry)
  lastInput: AgentInput | null;
  setLastInput: (i: AgentInput | null) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  screen: 'profile-picker',
  setScreen: (screen) => set({ screen }),

  context: null,
  setContext: (context) => set({ context }),
  clearContext: () => set({ context: null }),

  loading: false,
  loadingMessage: '',
  setLoading: (loading, message = '') => set({ loading, loadingMessage: message }),

  error: null,
  setError: (error) => set({ error }),

  network: 'OFFLINE',
  setNetwork: (network) => set({ network }),

  availableTimeMin: null,
  setAvailableTimeMin: (availableTimeMin) => set({ availableTimeMin }),

  topicId: null,
  setTopicId: (topicId) => set({ topicId }),

  lastInput: null,
  setLastInput: (lastInput) => set({ lastInput }),
}));
