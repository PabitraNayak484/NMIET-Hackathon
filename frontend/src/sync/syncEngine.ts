// ============================================================
// Sync Engine — batch sync pending events to backend
// Exponential backoff: 1s, 2s, 4s. Max 3 tries per cycle.
// Idempotent by event_id.
// ============================================================
import { getPendingEvents, markEventsSynced, markEventsRejected, countPendingEvents } from '../db/repo';
import { goSyncing, doneSync, useNetworkStore } from '../net/networkManager';

const API_BASE      = import.meta.env.VITE_API_BASE_URL ?? '/api';
const MAX_BATCH     = 50;
const MAX_RETRIES   = 3;
const BASE_DELAY_MS = 1000;

let syncInProgress = false;

export async function runSync(studentId: string, deviceId: string): Promise<void> {
  if (syncInProgress) return;
  const { status } = useNetworkStore.getState();
  if (status === 'OFFLINE') return;

  const pending = await getPendingEvents();
  if (pending.length === 0) {
    doneSync();
    return;
  }

  syncInProgress = true;
  goSyncing(pending.length);

  const batch = pending.slice(0, MAX_BATCH);
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    const delay = BASE_DELAY_MS * Math.pow(2, attempt);
    if (attempt > 0) await sleep(delay);

    try {
      const res = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          student: { id: studentId },
          events: batch,
        }),
      });

      if (!res.ok) {
        attempt++;
        continue;
      }

      const json = await res.json();

      // Mark accepted + duplicates as synced (duplicates are already on server)
      const synced = [...(json.accepted ?? []), ...(json.duplicates ?? [])];
      if (synced.length > 0) await markEventsSynced(synced);

      // Mark rejected with reasons
      if (json.rejected?.length > 0) await markEventsRejected(json.rejected);

      const remaining = await countPendingEvents();
      goSyncing(remaining);
      if (remaining === 0) break;

      // Sync remaining events recursively
      break;

    } catch {
      attempt++;
    }
  }

  syncInProgress = false;
  const remaining = await countPendingEvents();
  if (remaining === 0) {
    doneSync();
  } else {
    // Network lost mid-sync — events stay pending
    useNetworkStore.getState().setStatus('OFFLINE');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
