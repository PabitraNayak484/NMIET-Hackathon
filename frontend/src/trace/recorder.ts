// ============================================================
// Trace Recorder — structured event log for every agent turn
// Never raw chain-of-thought. Every step written by the executor.
// ============================================================
import type { TraceStep, TurnTrace, NetworkStatus } from '../types';

export function createTurnTrace(
  turn_id: string,
  student_id: string,
  network: NetworkStatus
): TurnTrace {
  return {
    turn_id,
    student_id,
    network,
    timestamp: new Date().toISOString(),
    steps: [],
  };
}

export function appendStep(trace: TurnTrace, step: TraceStep): TurnTrace {
  return { ...trace, steps: [...trace.steps, step] };
}

/** One-line summary shown collapsed in the UI */
export function summariseTrace(trace: TurnTrace): string {
  const toolNames = trace.steps
    .flatMap(s => (Array.isArray(s.tool) ? s.tool : s.tool ? [s.tool] : []))
    .filter(Boolean);
  const uniqueTools = [...new Set(toolNames)];
  const lastStep = trace.steps[trace.steps.length - 1];
  const nextAction = lastStep?.action ?? '—';
  return `${uniqueTools.length} tools used · Next: ${nextAction} · ${trace.network}`;
}

/** Plain-language version of the trace for the student */
export function humanReadableTrace(trace: TurnTrace): string[] {
  return trace.steps
    .filter(s => s.action || s.reason)
    .map(s => {
      if (s.node === 'PLAN' || s.node === 'ACT_NEXT') {
        return `Decision: ${s.action} — ${s.reason}`;
      }
      if (s.node === 'UPDATE_STATE' && s.delta) {
        const delta = s.delta as Record<string, string>;
        return `Mastery updated: ${delta.mastery ?? ''}`;
      }
      return `${s.node}: ${s.tool ?? ''}`;
    });
}

export function toJSON(trace: TurnTrace): string {
  return JSON.stringify(trace, null, 2);
}
