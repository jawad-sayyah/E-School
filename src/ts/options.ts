/*
 * The TypeScript settings every lesson uses, in one place, so Monaco in the browser and the
 * TypeScript compiler in the content tests agree on what is an error.
 *
 * Values are TypeScript's numeric enum values (Monaco's API takes those too):
 *   ScriptTarget.ES2022 = 9, ModuleKind.ESNext = 99, JsxEmit.ReactJSX = 4,
 *   ModuleDetectionKind.Force = 3, ModuleResolutionKind.Bundler = 100.
 */
export const TS_COMPILER_OPTIONS = {
  strict: true,
  target: 9,
  module: 99,
  moduleResolution: 100,
  // Every file is its own module, so two examples on one page never clash
  // ("Duplicate identifier 'CartItem'").
  moduleDetection: 3,
  jsx: 4,
  lib: ['es2022', 'dom', 'dom.iterable'],
  esModuleInterop: true,
  skipLibCheck: true,
  noEmitOnError: false,
  allowNonTsExtensions: true,
} as const;

/** Monaco's model URI for a lesson file. */
export function modelUri(name: string, tsx: boolean): string {
  return `file:///lessons/${name}.${tsx ? 'tsx' : 'ts'}`;
}

export interface TsDiagnostic {
  /** 1-based line in the student's code. */
  line: number;
  column: number;
  message: string;
  code: number;
  /** Where the error is: the student's code, or the hidden type checks after it. */
  source: 'code' | 'checks';
}

/**
 * Type-level checks are appended to the student's code in one hidden file, so they see the
 * same declarations. Returns the combined text and the line where the checks start.
 */
export function withTypeChecks(
  code: string,
  checks: string,
): { text: string; firstCheckLine: number } {
  const codeLines = code.split('\n').length;
  return { text: `${code}\n${checks}`, firstCheckLine: codeLines + 1 };
}

/** Splits diagnostics of a combined file back into the student's code and the checks. */
export function locate(
  line: number,
  firstCheckLine: number,
): Pick<TsDiagnostic, 'line' | 'source'> {
  return line >= firstCheckLine
    ? { line: line - firstCheckLine + 1, source: 'checks' }
    : { line, source: 'code' };
}

/** TypeScript's message text can be a chain of nested messages; flatten it. */
export function flattenMessage(
  message: string | { messageText: string; next?: unknown[] },
): string {
  if (typeof message === 'string') return message;
  const parts = [message.messageText];
  for (const n of (message.next ?? []) as { messageText: string; next?: unknown[] }[]) {
    parts.push(flattenMessage(n));
  }
  return parts.join(' ');
}

/** Compiled output → code the worker can run: no "use strict", module marker or source map. */
export function cleanEmit(js: string): string {
  return js
    .replace(/^"use strict";\s*/, '')
    .replace(/^export \{\};\s*$/m, '')
    .replace(/\n\/\/# sourceMappingURL=.*$/, '')
    .trimEnd();
}
