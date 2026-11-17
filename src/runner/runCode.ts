import { LIMITS, type Limits } from './limits';
import { buildWorkerSource, joinWithTests, type FetchMocks } from './prelude';
import type { TestResultMessage, TestsDoneMessage } from './testApi';
import { createBlobWorker } from './workerFactory';

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';

export interface ConsoleLine {
  level: ConsoleLevel;
  text: string;
}

/**
 * done        the code (and its timers) finished
 * timeout     MAX_MS passed; the worker was terminated
 * limit       more than MAX_LINES lines; the worker was terminated
 * cancelled   a new run (or unmount) replaced this one
 * unavailable Web Workers can't be created here
 */
export type RunStatus = 'done' | 'timeout' | 'limit' | 'cancelled' | 'unavailable';

export interface TestSummary {
  results: TestResultMessage[];
  passed: number;
  failed: number;
  skipped: number;
  crashed: boolean;
}

export interface RunResult {
  status: RunStatus;
  lineCount: number;
  /** Timers were still pending AFTER_MS after the code finished, so they were stopped. */
  timersStopped: boolean;
  syntaxError?: string;
  tests?: TestSummary;
}

/** The part of a Worker the runner needs, so tests can plug in Node's worker_threads. */
export interface WorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: { message?: string }) => void) | null;
  terminate(): void;
}

export type WorkerFactory = (source: string) => WorkerLike;

export interface RunOptions {
  limits?: Partial<Limits>;
  fetchMocks?: FetchMocks;
  fetchDelay?: number;
  /** Test code to run with the student's code (exercise mode). */
  tests?: string;
  createWorker?: WorkerFactory;
  /** How to batch line rendering. Defaults to once per animation frame. */
  schedule?: (flush: () => void) => void;
  onLines?: (lines: ConsoleLine[]) => void;
  onTest?: (result: TestResultMessage) => void;
  onDone?: (result: RunResult) => void;
}

type AsyncFunctionConstructor = new (...args: string[]) => (...args: unknown[]) => Promise<unknown>;
const AsyncFunction = Object.getPrototypeOf(async function () {})
  .constructor as AsyncFunctionConstructor;

/**
 * Parses (but never runs) the code, exactly as it will be wrapped in the worker.
 * Catches syntax errors early, with a clean message, and stops code like
 * "}); evil(); (async () => {" from breaking out of the wrapper.
 */
export function findSyntaxError(code: string): string | null {
  try {
    new AsyncFunction(code);
    return null;
  } catch (e) {
    return e instanceof SyntaxError ? `SyntaxError: ${e.message}` : null;
  }
}

const defaultSchedule = (flush: () => void) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => flush());
  else setTimeout(flush, 16);
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

const LEVELS: ConsoleLevel[] = ['log', 'info', 'warn', 'error'];

/** Runs code in a throwaway worker. Returns a function that cancels the run. */
export function runCode(code: string, options: RunOptions = {}): () => void {
  const limits: Limits = { ...LIMITS, ...options.limits };
  const schedule = options.schedule ?? defaultSchedule;
  const createWorker = options.createWorker ?? createBlobWorker;
  const testMode = typeof options.tests === 'string';

  let worker: WorkerLike | null = null;
  let finished = false;
  let hardTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  let afterTimer: ReturnType<typeof setTimeout> | undefined;
  let lineCount = 0;
  let buffer: ConsoleLine[] = [];
  let flushQueued = false;
  const testResults: TestResultMessage[] = [];
  let testsDone: TestsDoneMessage | null = null;

  const flush = () => {
    flushQueued = false;
    if (!buffer.length) return;
    const lines = buffer;
    buffer = [];
    options.onLines?.(lines);
  };

  const finish = (status: RunStatus, extra: Partial<RunResult> = {}) => {
    if (finished) return;
    finished = true;
    clearTimeout(hardTimer);
    clearTimeout(afterTimer);
    try {
      worker?.terminate();
    } catch {
      /* already gone */
    }
    flush();
    options.onDone?.({
      status,
      lineCount,
      timersStopped: false,
      ...extra,
      tests:
        testMode && testsDone
          ? {
              results: testResults,
              passed: testsDone.passed,
              failed: testsDone.failed,
              skipped: testsDone.skipped,
              crashed: Boolean(testsDone.crashed),
            }
          : undefined,
    });
  };

  const pushLine = (line: ConsoleLine) => {
    if (lineCount >= limits.MAX_LINES) {
      finish('limit');
      return;
    }
    lineCount++;
    buffer.push(line);
    if (!flushQueued) {
      flushQueued = true;
      schedule(flush);
    }
  };

  const syntaxError =
    findSyntaxError(code) ??
    (testMode
      ? (findSyntaxError(options.tests ?? '') ??
        findSyntaxError(joinWithTests(code, options.tests ?? '')))
      : null);
  if (syntaxError) {
    // Report asynchronously, so callers can store the cancel function first.
    queueMicrotask(() => {
      if (finished) return;
      pushLine({ level: 'error', text: `Uncaught ${syntaxError}` });
      finish('done', { syntaxError });
    });
    return () => finish('cancelled');
  }

  try {
    worker = createWorker(buildWorkerSource(code, { ...options, limits }));
  } catch {
    queueMicrotask(() => finish('unavailable'));
    return () => finish('cancelled');
  }

  hardTimer = setTimeout(() => finish('timeout'), limits.MAX_MS);

  worker.onmessage = ({ data }) => {
    if (finished || !isRecord(data)) return;
    switch (data.type) {
      case 'line': {
        const level = LEVELS.includes(data.level as ConsoleLevel)
          ? (data.level as ConsoleLevel)
          : 'log';
        pushLine({ level, text: String(data.text) });
        return;
      }
      case 'limit':
        finish('limit');
        return;
      case 'test':
        testResults.push(data as unknown as TestResultMessage);
        options.onTest?.(data as unknown as TestResultMessage);
        return;
      case 'tests-done':
        testsDone = data as unknown as TestsDoneMessage;
        finish('done');
        return;
      case 'settled':
        if (testMode) return; // wait for tests-done
        clearTimeout(hardTimer);
        afterTimer = setTimeout(() => finish('done', { timersStopped: true }), limits.AFTER_MS);
        return;
      case 'idle':
        if (!testMode) finish('done');
        return;
    }
  };

  worker.onerror = (event) => {
    if (finished) return;
    const message = (event.message ?? 'Error').replace(/^Uncaught /, '');
    pushLine({ level: 'error', text: `Uncaught ${message}` });
    finish('done');
  };

  return () => finish('cancelled');
}

export interface RunOutput extends RunResult {
  lines: ConsoleLine[];
}

/** Promise version of runCode: resolves with every line once the run ends. */
export function runToEnd(
  code: string,
  options: Omit<RunOptions, 'onLines' | 'onDone'> = {},
): Promise<RunOutput> {
  return new Promise((resolve) => {
    const lines: ConsoleLine[] = [];
    runCode(code, {
      ...options,
      schedule: options.schedule ?? ((flush) => flush()),
      onLines: (batch) => lines.push(...batch),
      onDone: (result) => resolve({ ...result, lines }),
    });
  });
}
