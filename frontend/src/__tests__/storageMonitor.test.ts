// ============================================================
// Tests: storageMonitor — MR-40 (persist + 80% warning)
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock navigator.storage before importing the module
const mockPersist   = vi.fn().mockResolvedValue(true);
const mockPersisted = vi.fn().mockResolvedValue(true);
const mockEstimate  = vi.fn().mockResolvedValue({ usage: 0, quota: 100 });

Object.defineProperty(globalThis, 'navigator', {
  value: {
    storage: {
      persist:   mockPersist,
      persisted: mockPersisted,
      estimate:  mockEstimate,
    },
  },
  writable: true,
});

import 'fake-indexeddb/auto';
import {
  requestPersistentStorage, checkStorageBudget,
  getLastStorageStatus, onStorageStatusChange,
} from '@/storage/storageMonitor';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MR-40: Persistent storage request', () => {
  it('calls navigator.storage.persist() and returns true when granted', async () => {
    mockPersist.mockResolvedValueOnce(true);
    const result = await requestPersistentStorage();
    expect(mockPersist).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });

  it('returns false when persist is denied', async () => {
    mockPersist.mockResolvedValueOnce(false);
    const result = await requestPersistentStorage();
    expect(result).toBe(false);
  });

  it('returns false gracefully when navigator.storage is absent', async () => {
    const origStorage = navigator.storage;
    (navigator as any).storage = undefined;
    const result = await requestPersistentStorage();
    expect(result).toBe(false);
    (navigator as any).storage = origStorage;
  });
});

describe('MR-40: Storage budget warning at 80%', () => {
  it('warning is false when usage is below 80%', async () => {
    mockEstimate.mockResolvedValueOnce({ usage: 70, quota: 100 });
    const status = await checkStorageBudget();
    expect(status.warning).toBe(false);
    expect(status.usageFraction).toBeCloseTo(0.7);
  });

  it('warning is true when usage exceeds 80%', async () => {
    mockEstimate.mockResolvedValueOnce({ usage: 85, quota: 100 });
    const status = await checkStorageBudget();
    expect(status.warning).toBe(true);
  });

  it('notifies listeners when status changes', async () => {
    mockEstimate.mockResolvedValueOnce({ usage: 90, quota: 100 });
    const received: boolean[] = [];
    const unsubscribe = onStorageStatusChange(s => received.push(s.warning));
    await checkStorageBudget();
    unsubscribe();
    expect(received).toContain(true);
  });

  it('getLastStorageStatus reflects the most recent check', async () => {
    mockEstimate.mockResolvedValueOnce({ usage: 20, quota: 100 });
    await checkStorageBudget();
    const s = getLastStorageStatus();
    expect(s.usageFraction).toBeCloseTo(0.2);
  });
});

