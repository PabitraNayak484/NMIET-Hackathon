// ============================================================
// Network Manager — 4-state machine
// ONLINE → OFFLINE → RECONNECTING → SYNCING → ONLINE
// ============================================================
import { create } from 'zustand';
import type { NetworkStatus } from '../types';

const HEALTH_ENDPOINT  = `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/health`;
const PING_INTERVAL_MS = 10_000;
const PING_TIMEOUT_MS  = 2_000;
const FAIL_THRESHOLD   = 2;   // consecutive failures to go OFFLINE

interface NetworkStore {
  status:      NetworkStatus;
  pendingSync: number;
  llmOk:       boolean;
  setStatus:   (s: NetworkStatus) => void;
  setPending:  (n: number) => void;
  setLlmOk:   (ok: boolean) => void;
}

export const useNetworkStore = create<NetworkStore>(set => ({
  status:      'ONLINE',
  pendingSync: 0,
  llmOk:       true,
  setStatus:   status => set({ status }),
  setPending:  pendingSync => set({ pendingSync }),
  setLlmOk:   llmOk => set({ llmOk }),
}));

// ---- Internal state -----------------------------------------
let pingTimer: ReturnType<typeof setInterval> | null = null;
let failCount = 0;
let llmFailCount = 0;
let llmCooldownTimer: ReturnType<typeof setTimeout> | null = null;

let _onSyncTrigger: (() => void) | null = null;

export function registerNetworkSyncCallback(fn: () => void) {
  _onSyncTrigger = fn;
}

// ---- Boot ---------------------------------------------------

export function startNetworkManager() {
  // Browser online/offline events
  window.addEventListener('online',  () => handleOnlineEvent());
  window.addEventListener('offline', () => goOffline());

  // Active health ping
  pingTimer = setInterval(pingHealth, PING_INTERVAL_MS);
  pingHealth(); // immediate first ping
}

export function stopNetworkManager() {
  if (pingTimer) clearInterval(pingTimer);
  window.removeEventListener('online',  handleOnlineEvent as any);
  window.removeEventListener('offline', goOffline as any);
}

// ---- State transitions --------------------------------------

async function pingHealth(): Promise<void> {
  const { status } = useNetworkStore.getState();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const res = await fetch(HEALTH_ENDPOINT, { signal: controller.signal });
    clearTimeout(id);

    if (res.ok) {
      failCount = 0;
      if (status === 'OFFLINE' || status === 'RECONNECTING') {
        goReconnecting();
      } else {
        goOnline();
      }
    } else {
      handleFailure();
    }
  } catch {
    handleFailure();
  }
}

function handleFailure() {
  failCount++;
  if (failCount >= FAIL_THRESHOLD) goOffline();
}

function handleOnlineEvent() {
  const { status } = useNetworkStore.getState();
  if (status === 'OFFLINE') goReconnecting();
}

function goOnline() {
  useNetworkStore.getState().setStatus('ONLINE');
}

function goOffline() {
  failCount = 0;
  useNetworkStore.getState().setStatus('OFFLINE');
}

function goReconnecting() {
  useNetworkStore.getState().setStatus('RECONNECTING');
  // Trigger sync if there are pending events
  if (_onSyncTrigger) _onSyncTrigger();
}

export function goSyncing(pending: number) {
  useNetworkStore.getState().setStatus('SYNCING');
  useNetworkStore.getState().setPending(pending);
}

export function doneSync() {
  useNetworkStore.getState().setStatus('ONLINE');
  useNetworkStore.getState().setPending(0);
}

// ---- LLM circuit breaker -----------------------------------

export function isLLMAvailable(): boolean {
  const { status, llmOk } = useNetworkStore.getState();
  return status === 'ONLINE' && llmOk;
}

export function recordLLMFailure() {
  llmFailCount++;
  if (llmFailCount >= 2) {
    useNetworkStore.getState().setLlmOk(false);
    if (llmCooldownTimer) clearTimeout(llmCooldownTimer);
    llmCooldownTimer = setTimeout(() => {
      llmFailCount = 0;
      useNetworkStore.getState().setLlmOk(true);
    }, 60_000); // 60s cooldown
  }
}

export function recordLLMSuccess() {
  llmFailCount = 0;
  useNetworkStore.getState().setLlmOk(true);
}
