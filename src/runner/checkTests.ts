import { checkExercise, type ExerciseCheck } from './checkExercise';
import type { RunOptions } from './runCode';

export interface BugVariant {
  /** A short name, e.g. "Ignores qty". */
  title: string;
  /** Shown when the student's tests miss this bug. */
  hint?: string;
  /** The buggy implementation. */
  code: string;
}

export interface BugResult {
  title: string;
  hint?: string;
  /** True when at least one of the student's tests failed (or crashed) on this version. */
  caught: boolean;
}

export interface TestsCheck {
  /** The student's tests run against the correct implementation. */
  correct: ExerciseCheck;
  bugs: BugResult[];
  caught: number;
  /** Tests pass on the correct code, and every bug makes at least one test fail. */
  passed: boolean;
}

/**
 * Grades tests the student wrote: they must pass on the correct code and catch every
 * buggy version (PROMPT.md: <TestExercise>).
 */
export async function checkTests(
  correctCode: string,
  bugs: BugVariant[],
  studentTests: string,
  options: Omit<RunOptions, 'tests' | 'onLines' | 'onDone'> = {},
): Promise<TestsCheck> {
  const [correct, ...variants] = await Promise.all([
    checkExercise(correctCode, studentTests, options),
    ...bugs.map((b) => checkExercise(b.code, studentTests, options)),
  ]);
  const results = bugs.map((b, i) => ({
    title: b.title,
    hint: b.hint,
    // A bug is caught when the suite doesn't fully pass on it, but only if the tests
    // could actually run (a syntax error in the tests catches nothing).
    caught: !variants[i].passed && !variants[i].problem?.startsWith('Your code has a syntax error'),
  }));
  const caught = results.filter((r) => r.caught).length;
  return {
    correct,
    bugs: results,
    caught,
    passed: correct.passed && caught === bugs.length,
  };
}

/** Reads `title="…"` and `hint="…"` from a fence's meta string. */
export function metaAttrs(meta: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of meta.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}
