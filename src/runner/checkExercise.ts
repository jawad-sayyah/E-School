import { runToEnd, type ConsoleLine, type RunOptions, type RunStatus } from './runCode';
import type { TestResultMessage } from './testApi';

export interface ExerciseCheck {
  passed: boolean;
  status: RunStatus;
  results: TestResultMessage[];
  lines: ConsoleLine[];
  counts: { passed: number; failed: number; skipped: number };
  /** Why no test could run: a syntax error, a crash, a timeout… */
  problem?: string;
}

/** Runs the student's code together with hidden tests and decides whether it passes. */
export async function checkExercise(
  code: string,
  tests: string,
  options: Omit<RunOptions, 'tests' | 'onLines' | 'onDone'> = {},
): Promise<ExerciseCheck> {
  const run = await runToEnd(code, { ...options, tests });
  const summary = run.tests;
  const counts = {
    passed: summary?.passed ?? 0,
    failed: summary?.failed ?? 0,
    skipped: summary?.skipped ?? 0,
  };
  const firstError = run.lines.find((l) => l.level === 'error')?.text;

  let problem: string | undefined;
  if (run.syntaxError) problem = `Your code has a syntax error: ${run.syntaxError}`;
  else if (run.status === 'timeout')
    problem = 'The tests took too long. Is there an infinite loop?';
  else if (run.status === 'limit') problem = 'Too much output. Is a loop running forever?';
  else if (run.status === 'unavailable') problem = 'Tests can’t run in this browser.';
  else if (summary?.crashed)
    problem = `Your code crashed before the tests ran: ${firstError ?? 'unknown error'}`;
  else if (!summary)
    problem = firstError ? `The tests couldn’t run: ${firstError}` : 'The tests didn’t finish.';

  return {
    passed: !problem && counts.failed === 0 && counts.passed > 0,
    status: run.status,
    results: summary?.results ?? [],
    lines: run.lines,
    counts,
    problem,
  };
}
