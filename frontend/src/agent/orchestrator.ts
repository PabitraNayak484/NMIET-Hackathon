// ============================================================
// Agent Orchestrator — executes the 8-node pipeline
// UNDERSTAND → INSPECT_STATE → PLAN → RETRIEVE → TEACH
//   → ASSESS → UPDATE_STATE → ACT_NEXT
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import type { AgentContext, AgentInput, TraceStep } from '../types';
import { useNetworkStore } from '../net/networkManager';
import { isLLMAvailable } from '../net/networkManager';
import { createTurnTrace } from '../trace/recorder';

// ---- Node imports -------------------------------------------
import { runUnderstand }   from './nodes/understand';
import { runInspectState } from './nodes/inspectState';
import { runPlan }         from './nodes/plan';
import { runRetrieve }     from './nodes/retrieve';
import { runTeach }        from './nodes/teach';
import { runAssess }       from './nodes/assess';
import { runEvaluate }     from './nodes/evaluate';
import { runUpdateState }  from './nodes/updateState';
import { runActNext }      from './nodes/actNext';

// ---- Node type ----------------------------------------------

interface AgentNode {
  name:      string;
  run:       (ctx: AgentContext) => Promise<AgentContext>;
  timeoutMs: number;
  retries:   number;
}

// ---- Pipeline definitions ----------------------------------

const QUESTION_PIPELINE: AgentNode[] = [
  { name: 'UNDERSTAND',    run: runUnderstand,   timeoutMs: 3000, retries: 1 },
  { name: 'INSPECT_STATE', run: runInspectState, timeoutMs: 3000, retries: 1 },
  { name: 'PLAN',          run: runPlan,         timeoutMs: 3000, retries: 1 },
  { name: 'RETRIEVE',      run: runRetrieve,     timeoutMs: 3000, retries: 1 },
  { name: 'TEACH',         run: runTeach,        timeoutMs: 6000, retries: 2 },
  { name: 'ASSESS',        run: runAssess,       timeoutMs: 3000, retries: 1 },
];

const ANSWER_PIPELINE: AgentNode[] = [
  { name: 'EVALUATE',     run: runEvaluate,    timeoutMs: 3000, retries: 1 },
  { name: 'UPDATE_STATE', run: runUpdateState, timeoutMs: 3000, retries: 1 },
  { name: 'ACT_NEXT',     run: runActNext,     timeoutMs: 3000, retries: 1 },
];

const NEXT_PIPELINE: AgentNode[] = [
  { name: 'INSPECT_STATE', run: runInspectState, timeoutMs: 3000, retries: 1 },
  { name: 'PLAN',          run: runPlan,         timeoutMs: 3000, retries: 1 },
  { name: 'RETRIEVE',      run: runRetrieve,     timeoutMs: 3000, retries: 1 },
  { name: 'TEACH',         run: runTeach,        timeoutMs: 6000, retries: 2 },
];

function pipelineFor(input: AgentInput): AgentNode[] {
  switch (input.type) {
    case 'question':
    case 'tap_topic': return QUESTION_PIPELINE;
    case 'answer':    return ANSWER_PIPELINE;
    case 'next':      return NEXT_PIPELINE;
  }
}

// ---- Main entry point ---------------------------------------

export async function runTurn(
  studentId: string,
  deviceId:  string,
  input:     AgentInput
): Promise<AgentContext> {
  const { status } = useNetworkStore.getState();
  const turnId = `t_${uuidv4().slice(0, 8)}`;

  let ctx: AgentContext = {
    turnId,
    studentId,
    deviceId,
    input,
    network: status,
    trace:   [],
  };

  createTurnTrace(turnId, studentId, status); // kept for future trace persistence
  const pipeline = pipelineFor(input);

  for (const node of pipeline) {
    const t0 = Date.now();
    try {
      ctx = await withTimeoutAndRetry(node.run, ctx, node.timeoutMs, node.retries);
      // Trace is written by each node into ctx.trace — we just record timing
    } catch (err) {
      const step: TraceStep = {
        node:      node.name,
        error:     String(err),
        durationMs: Date.now() - t0,
      };
      ctx = { ...ctx, trace: [...ctx.trace, step], error: String(err) };
      console.error(`[Orchestrator] Node ${node.name} failed:`, err);
      break; // safe stop — worst case shows cached explanation
    }
  }

  return ctx;
}

// ---- Timeout + Retry wrapper --------------------------------

async function withTimeoutAndRetry<T>(
  fn:        (arg: T) => Promise<T>,
  arg:       T,
  timeoutMs: number,
  retries:   number
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await Promise.race([
        fn(arg),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
    } catch (err) {
      lastError = err;
      if (attempt < retries) await sleep(300 * (attempt + 1));
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// Re-export isLLMAvailable so nodes can use it
export { isLLMAvailable };
