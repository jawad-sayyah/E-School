/**
 * Wraps a test file so that it PASSES only when at least one of its tests FAILS: used to
 * check that example tests catch a buggy component. The file's own test/it/describe and
 * hooks are collected instead of registered, then run by one real Vitest test.
 */
const COLLECTED = new Set(['test', 'it', 'describe', 'beforeEach', 'afterEach']);

/** Removes the names the wrapper defines itself from `import { … } from "vitest"`. */
function withoutCollectedImports(code) {
  return code.replace(/import\s*\{([^}]*)\}\s*from\s*(["'])vitest\2;?/g, (_m, names) => {
    const kept = names
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n && !COLLECTED.has(n.split(/\s+as\s+/)[0]));
    return kept.length ? `import { ${kept.join(', ')} } from "vitest";` : '';
  });
}

export function catchesBug(rawTestCode, title) {
  const testCode = withoutCollectedImports(rawTestCode);
  const prefix = [
    'import { cleanup as __cleanup } from "@testing-library/react";',
    'const __collected = [];',
    'const __before = [];',
    'const __after = [];',
    'const test = (name, fn) => { __collected.push({ name, fn }); };',
    'test.skip = () => {};',
    'test.todo = () => {};',
    'const it = test;',
    'const describe = (name, fn) => fn();',
    'describe.skip = () => {};',
    'const beforeEach = (fn) => { __before.push(fn); };',
    'const afterEach = (fn) => { __after.push(fn); };',
    '',
  ].join('\n');
  const suffix = [
    '',
    `globalThis.test(${JSON.stringify(`the example tests catch: ${title}`)}, async () => {`,
    '  let failed = 0;',
    '  for (const t of __collected) {',
    '    try {',
    '      for (const b of __before) await b();',
    '      await t.fn();',
    '    } catch {',
    '      failed++;',
    '    } finally {',
    '      for (const a of __after) await a();',
    '      __cleanup();',
    '    }',
    '  }',
    '  globalThis.expect(failed).toBeGreaterThan(0);',
    '});',
    '',
  ].join('\n');
  return prefix + testCode + suffix;
}
