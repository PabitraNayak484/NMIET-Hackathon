// ============================================================
// Trace model — re-exports TraceStep / TurnTrace from types.ts
// and provides node icon/colour mappings for the TracePage UI.
// ============================================================
export type { TraceStep, TurnTrace } from '../types';

// Node metadata for the timeline UI
export interface NodeMeta {
  icon:  string;
  label: string;
  color: string;
}

export const NODE_META: Record<string, NodeMeta> = {
  UNDERSTAND:    { icon: '🔍', label: 'Understand',    color: 'var(--primary)' },
  INSPECT_STATE: { icon: '📊', label: 'Inspect State', color: 'var(--accent)' },
  PLAN:          { icon: '🗺️', label: 'Plan',          color: 'var(--warning)' },
  RETRIEVE:      { icon: '📚', label: 'Retrieve',      color: 'var(--primary)' },
  TEACH:         { icon: '🎓', label: 'Teach',         color: 'var(--success)' },
  ASSESS:        { icon: '📝', label: 'Assess',        color: 'var(--accent)' },
  EVALUATE:      { icon: '✅', label: 'Evaluate',      color: 'var(--success)' },
  UPDATE_STATE:  { icon: '💾', label: 'Update State',  color: 'var(--warning)' },
  ACT_NEXT:      { icon: '➡️', label: 'Act Next',      color: 'var(--primary)' },
};

export function getNodeMeta(nodeName: string): NodeMeta {
  return NODE_META[nodeName] ?? { icon: '⚙️', label: nodeName, color: 'var(--text-muted)' };
}
