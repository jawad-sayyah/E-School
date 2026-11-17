import type { SandpackFiles } from '@codesandbox/sandpack-react';

/**
 * Sandpack's test runner renders into jsdom but exposes the browser's own FormData, which
 * rejects jsdom forms, so React 19 form actions would fail. Hidden test files get this line
 * first, making the global FormData jsdom's. (Harmless where they're already the same.)
 */
export const TEST_PRELUDE =
  'if (typeof document !== "undefined" && document.defaultView && document.defaultView.FormData !== FormData) globalThis.FormData = document.defaultView.FormData;\n';

/**
 * Sandpack's test runner is Jest-based. This hidden local package lets test files be written
 * the Vitest way (`import { vi, test, expect } from "vitest"`): it re-exports Jest's globals,
 * and `vi` is Jest's `jest` object (fn, spyOn, useFakeTimers, advanceTimersByTime…).
 * In the generated Vitest tests, "vitest" is the real thing.
 */
export const VITEST_SHIM: SandpackFiles = {
  '/node_modules/vitest/package.json': {
    code: JSON.stringify({ name: 'vitest', version: '0.0.0-sandpack', main: 'index.js' }),
    hidden: true,
  },
  '/node_modules/vitest/index.js': {
    code: [
      'const g = globalThis;',
      'export const vi = g.jest;',
      'export const test = g.test;',
      'export const it = g.it;',
      'export const describe = g.describe;',
      'export const expect = g.expect;',
      'export const beforeEach = g.beforeEach;',
      'export const afterEach = g.afterEach;',
      'export const beforeAll = g.beforeAll;',
      'export const afterAll = g.afterAll;',
      '',
    ].join('\n'),
    hidden: true,
  },
};
