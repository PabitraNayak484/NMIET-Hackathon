// ============================================================
// Storage Monitor — persistent storage + budget (MR-40, MR-41)
// Call init() once at app boot (from main.tsx / integrity.ts).
// ============================================================
import { getMeta, setMeta, pruneOldSyncedEvents } from '../db/repo';

const STORAGE_PERSIST_KEY = 'storage_persist_granted';
const WARN_THRESHOLD = 0.8;   // warn at 80% of quota

export interface StorageStatus {
  persisted: boolean;
  usageBytes: number;
  quotaBytes: number;
  usageFraction: number;   // 0-1
  warning: boolean;        // true when usageFraction > WARN_THRESHOLD
}

// ---- In-memory cache (updated on each check) ----------------

let _lastStatus: StorageStatus = {
  persisted: false,
  usageBytes: 0,
  quotaBytes: 0,
  usageFraction: 0,
  warning: false,
};

export function getLastStorageStatus(): StorageStatus {
  return _lastStatus;
}

// ---- Listeners ----------------------------------------------

type Listener = (status: StorageStatus) => void;
const _listeners: Set<Listener> = new Set();

export function onStorageStatusChange(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _notify(status: StorageStatus): void {
  _lastStatus = status;
  _listeners.forEach(fn => fn(status));
}

// ---- Core API -----------------------------------------------

/**
 * Request persistent storage (MR-40).
 * Called once at first run from init().
 * Result is stored in meta so the UI can show persist status.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  const granted = await navigator.storage.persist();
  await setMeta(STORAGE_PERSIST_KEY, granted ? '1' : '0');
  return granted;
}

export async function isPersistGranted(): Promise<boolean> {
  if (navigator.storage?.persisted) {
    return navigator.storage.persisted();
  }
  const cached = await getMeta(STORAGE_PERSIST_KEY);
  return cached === '1';
}

/**
 * Read current storage estimate and update _lastStatus.
 * Emits a warning event when above WARN_THRESHOLD (MR-40).
 */
export async function checkStorageBudget(): Promise<StorageStatus> {
  const persisted = await isPersistGranted();

  if (!navigator.storage?.estimate) {
    _notify({ persisted, usageBytes: 0, quotaBytes: 0, usageFraction: 0, warning: false });
    return _lastStatus;
  }

  const { usage = 0, quota = 1 } = await navigator.storage.estimate();
  const fraction = quota > 0 ? usage / quota : 0;

  const status: StorageStatus = {
    persisted,
    usageBytes:    usage,
    quotaBytes:    quota,
    usageFraction: fraction,
    warning:       fraction > WARN_THRESHOLD,
  };

  _notify(status);
  return status;
}

/**
 * Prune synced events older than `days` and re-check storage.
 * Called automatically on boot (MR-41).
 */
export async function pruneAndCheck(days = 30): Promise<{ pruned: number; status: StorageStatus }> {
  const pruned = await pruneOldSyncedEvents(days);
  const status = await checkStorageBudget();
  return { pruned, status };
}

// ---- Boot init (call from integrity.ts / main.tsx) ----------

export async function initStorageMonitor(): Promise<void> {
  await requestPersistentStorage();
  await pruneAndCheck(30);
}
