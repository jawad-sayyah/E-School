import { useCallback, useEffect, useRef, useState } from 'react';
import { LIMITS, RUNNER_MESSAGES, runCode, type FetchMocks, type RunResult } from '@/runner';
import type { DisplayLine } from './ConsoleView';

export type RunPhase = 'idle' | 'running' | 'done' | 'unavailable';

interface RunnerOptions {
  fetchMocks?: FetchMocks;
  fetchDelay?: number;
}

function noticesFor(result: RunResult): DisplayLine[] {
  switch (result.status) {
    case 'timeout':
      return [{ level: 'error', text: RUNNER_MESSAGES.timeout(LIMITS.MAX_MS) }];
    case 'limit':
      return [{ level: 'error', text: RUNNER_MESSAGES.lines(LIMITS.MAX_LINES) }];
    case 'done':
      if (result.timersStopped)
        return [{ level: 'muted', text: RUNNER_MESSAGES.timers(LIMITS.AFTER_MS) }];
      if (result.lineCount === 0) return [{ level: 'muted', text: RUNNER_MESSAGES.empty }];
      return [];
    default:
      return [];
  }
}

/** Runs code in the worker and collects console lines for display. */
export function useRunner({ fetchMocks, fetchDelay }: RunnerOptions = {}) {
  const [lines, setLines] = useState<DisplayLine[]>([]);
  const [phase, setPhase] = useState<RunPhase>('idle');
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelRef.current?.(), []);

  const run = useCallback(
    (code: string) => {
      // A new run always replaces the old one (cancel first, so its last lines are dropped).
      cancelRef.current?.();
      setLines([]);
      setPhase('running');
      let shown = 0;
      cancelRef.current = runCode(code, {
        fetchMocks,
        fetchDelay,
        onLines: (batch) => {
          const room = LIMITS.MAX_LINES - shown; // never render more than the limit
          if (room <= 0) return;
          const visible = batch.slice(0, room);
          shown += visible.length;
          setLines((prev) => [...prev, ...visible]);
        },
        onDone: (result) => {
          if (result.status === 'cancelled') return;
          cancelRef.current = null;
          if (result.status === 'unavailable') {
            setPhase('unavailable');
            return;
          }
          const notices = noticesFor(result);
          if (notices.length) setLines((prev) => [...prev, ...notices]);
          setPhase('done');
        },
      });
    },
    [fetchMocks, fetchDelay],
  );

  const reset = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    setLines([]);
    setPhase('idle');
  }, []);

  return { lines, phase, run, reset };
}
