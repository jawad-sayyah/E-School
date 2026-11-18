/** The shape of Sandpack's test results (only what we read), kept here so it's testable. */
export interface SpecTest {
  name: string;
  blocks: string[];
  status: 'idle' | 'running' | 'pass' | 'fail';
  errors: { message?: string }[];
}

export interface SpecDescribe {
  name: string;
  tests: Record<string, SpecTest>;
  describes: Record<string, SpecDescribe>;
}

export type SpecResult = SpecDescribe & { error?: { message?: string } };

export interface SpecSummary {
  passed: number;
  failed: number;
  /** A test file failed to run at all (syntax error, crash on import…). */
  broken: string | null;
  tests: { name: string; status: SpecTest['status']; message?: string }[];
  allPassed: boolean;
}

function collect(block: SpecDescribe, out: SpecTest[]) {
  // Sandpack can report a file before its tests are known.
  out.push(...Object.values(block.tests ?? {}));
  for (const child of Object.values(block.describes ?? {})) collect(child, out);
}

/** Flattens Sandpack's nested spec results into counts and a list of tests. */
export function summarizeSpecs(specs: Record<string, SpecResult>): SpecSummary {
  const all: SpecTest[] = [];
  let broken: string | null = null;
  for (const spec of Object.values(specs)) {
    if (spec.error) broken = spec.error.message ?? 'The tests could not run.';
    collect(spec, all);
  }
  const passed = all.filter((t) => t.status === 'pass').length;
  const failed = all.filter((t) => t.status === 'fail').length;
  return {
    passed,
    failed,
    broken,
    tests: all.map((t) => ({
      name: [...t.blocks, t.name].join(' › '),
      status: t.status,
      message: t.errors[0]?.message,
    })),
    allPassed: !broken && failed === 0 && passed > 0,
  };
}

export interface FileBlock {
  lang: string;
  meta: string;
  code: string;
}

/** Reads `file=/App.js` from a fence's meta; defaults by language. */
export function fileName(block: FileBlock, fallback = '/App.js'): string {
  const named = /(?:^|\s)file=(\S+)/.exec(block.meta)?.[1];
  if (named) return named.startsWith('/') ? named : `/${named}`;
  if (block.lang === 'css') return '/styles.css';
  return fallback;
}

/** Builds a Sandpack files map from fenced blocks, optionally only those marked with a word. */
export function filesFrom(blocks: FileBlock[], word?: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const block of blocks) {
    const words = block.meta.split(/\s+/);
    if (word && !words.includes(word)) continue;
    files[fileName(block)] = block.code;
  }
  return files;
}

/* ── Write-the-tests exercises in Sandpack ───────────────────────────────── */

/**
 * Hidden test files: a copy of the student's tests per buggy version, with the same extension
 * as the student's file (a .tsx test copied into a .js file would fail to parse).
 */
export const checkFile = (index: number, testFile = '/App.test.js') =>
  `/check-${index + 1}.test.${/.([jt]sx?)$/.exec(testFile)?.[1] ?? 'js'}`;
/** Where buggy version N of a file lives. */
export const bugPath = (index: number, file: string) => `/__bugs__/bug-${index + 1}${file}`;

/**
 * Points the student's imports of the code under test at a buggy copy:
 * `from "./Cart"` → `from "./__bugs__/bug-1/Cart"` (for every file under test).
 */
export function retarget(testCode: string, files: string[], index: number): string {
  let out = testCode;
  for (const file of files) {
    const base = file.replace(/^\//, '').replace(/\.(jsx?|tsx?)$/, '');
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`(["'])\\./${escaped}(\\.(?:jsx?|tsx?))?\\1`, 'g');
    out = out.replace(rx, (_m, quote: string) => `${quote}.${bugPath(index, '/' + base)}${quote}`);
  }
  return out;
}

/** Sandpack's results, one summary per test file. */
export function summarizeByFile(specs: Record<string, SpecResult>): Record<string, SpecSummary> {
  const out: Record<string, SpecSummary> = {};
  for (const [path, spec] of Object.entries(specs)) out[path] = summarizeSpecs({ [path]: spec });
  return out;
}
