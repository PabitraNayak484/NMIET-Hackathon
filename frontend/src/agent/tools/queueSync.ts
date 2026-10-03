// ============================================================
// Tool: queue_sync
// Returns pending event count and triggers the sync engine.
// ============================================================
import { countPendingEvents } from '../../db/repo';
import type { ToolResult } from '../../types';

export interface QueueSyncResult {
  pending_count: number;
  queued: boolean;
}

// Sync engine reference — set by the app on boot
let _triggerSync: (() => void) | null = null;

export function registerSyncTrigger(fn: () => void): void {
  _triggerSync = fn;
}

export async function queueSync(): Promise<ToolResult<QueueSyncResult>> {
  const t0 = Date.now();
  const pending_count = await countPendingEvents();

  if (_triggerSync && pending_count > 0) {
    _triggerSync(); // non-blocking: sync happens in background
  }

  return {
    ok: true,
    data: { pending_count, queued: pending_count > 0 },
    durationMs: Date.now() - t0,
  };
}
