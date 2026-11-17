import type { TsDiagnostic } from './options';

export interface TypeCheckFailure {
  /** What the check expected, in words. */
  title: string;
  /** TypeScript's own message. */
  detail: string;
}

/** TS error code for "Unused '@ts-expect-error' directive". */
const UNUSED_EXPECT_ERROR = 2578;

/**
 * Turns a diagnostic inside the hidden type checks into a readable failure:
 * - an unused `// @ts-expect-error reason` means the code ALLOWED something it should reject;
 * - any other error means the code REJECTED something it should allow.
 */
export function describeTypeCheck(checks: string, d: TsDiagnostic): TypeCheckFailure {
  const lines = checks.split('\n');
  const line = lines[d.line - 1]?.trim() ?? '';
  if (d.code === UNUSED_EXPECT_ERROR) {
    const reason = line.replace(/^\/\/\s*@ts-expect-error\s*/, '').trim();
    const next = lines[d.line]?.trim() ?? '';
    return {
      title: reason ? `Should be a type error: ${reason}` : `Should be a type error: \`${next}\``,
      detail: `TypeScript accepted \`${next}\`, so your types are too loose.`,
    };
  }
  // A failing "should compile" check: use the comment above it as the description, if any.
  const above = lines[d.line - 2]?.trim() ?? '';
  const reason =
    above.startsWith('//') && !above.includes('@ts-expect-error') ? above.slice(2).trim() : '';
  return {
    title: reason ? `Should type-check: ${reason}` : `Should type-check: \`${line}\``,
    detail: d.message,
  };
}
