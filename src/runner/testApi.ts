export interface TestResultMessage {
  type: 'test';
  name: string;
  /** Names of the enclosing describe() blocks, outermost first. */
  suite: string[];
  status: 'pass' | 'fail' | 'skip';
  message?: string;
  expected?: string;
  received?: string;
}

export interface TestsDoneMessage {
  type: 'tests-done';
  passed: number;
  failed: number;
  skipped: number;
  /** The student's code threw before any test could run. */
  crashed?: boolean;
}

/**
 * Installs a Vitest-shaped test API (describe / test / it / expect) on `g`
 * and returns a function that runs every registered test in order.
 *
 * IMPORTANT: injected into the worker with `installTestApi.toString()`, so it must
 * stay self-contained: no imports, no helpers outside its body.
 */
export function installTestApi(
  g: Record<string, unknown>,
  send: (message: TestResultMessage | TestsDoneMessage) => void,
  fmt: (value: unknown) => string,
): () => Promise<void> {
  type TestFn = () => unknown;
  const tests: { name: string; suite: string[]; fn: TestFn; skip: boolean }[] = [];
  const suite: string[] = [];
  let skipDepth = 0;

  class AssertionError extends Error {
    expected?: string;
    received?: string;
    constructor(message: string, expected?: string, received?: string) {
      super(message);
      this.name = 'AssertionError';
      this.expected = expected;
      this.received = received;
    }
  }

  const isObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null;

  const equals = (a: unknown, b: unknown, seen: unknown[]): boolean => {
    if (Object.is(a, b)) return true;
    if (!isObject(a) || !isObject(b)) return false;
    if (seen.includes(a)) return true;
    const next = [...seen, a];
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    if (a instanceof RegExp && b instanceof RegExp) return String(a) === String(b);
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((item, i) => equals(item, b[i], next));
    }
    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      for (const [k, v] of a) if (!b.has(k) || !equals(v, b.get(k), next)) return false;
      return true;
    }
    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) return false;
      for (const v of a) if (!b.has(v)) return false;
      return true;
    }
    // Like Vitest's toEqual: keys whose value is undefined are ignored.
    const keysA = Object.keys(a).filter((k) => a[k] !== undefined);
    const keysB = Object.keys(b).filter((k) => b[k] !== undefined);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(
      (k) => Object.prototype.hasOwnProperty.call(b, k) && equals(a[k], b[k], next),
    );
  };

  const describe = (name: unknown, fn: () => void) => {
    suite.push(String(name));
    try {
      fn();
    } finally {
      suite.pop();
    }
  };
  describe.skip = (name: unknown, fn: () => void) => {
    skipDepth++;
    try {
      describe(name, fn);
    } finally {
      skipDepth--;
    }
  };

  const test = (name: unknown, fn: TestFn) => {
    tests.push({ name: String(name), suite: [...suite], fn, skip: skipDepth > 0 });
  };
  test.skip = (name: unknown, fn: TestFn) => {
    tests.push({ name: String(name), suite: [...suite], fn, skip: true });
  };
  test.todo = (name: unknown) => {
    tests.push({ name: String(name), suite: [...suite], fn: () => undefined, skip: true });
  };

  const makeMatchers = (received: unknown, negate: boolean) => {
    const not = negate ? ' not' : '';
    const check = (pass: boolean, message: string, expected?: unknown, hint?: string) => {
      if (pass !== negate) return;
      const showValues = expected !== undefined;
      throw new AssertionError(
        message + (hint && !negate ? ' ' + hint : ''),
        showValues ? fmt(expected) : undefined,
        showValues ? fmt(received) : undefined,
      );
    };
    return {
      toBe(expected: unknown) {
        const sameShape = isObject(expected) && equals(received, expected, []);
        check(
          Object.is(received, expected),
          `expected ${fmt(received)}${not} to be ${fmt(expected)}`,
          expected,
          sameShape ? '(same contents, different objects: use toEqual to compare contents)' : '',
        );
      },
      toEqual(expected: unknown) {
        check(
          equals(received, expected, []),
          `expected ${fmt(received)}${not} to equal ${fmt(expected)}`,
          expected,
        );
      },
      toContain(item: unknown) {
        const pass =
          typeof received === 'string'
            ? received.includes(String(item))
            : Array.isArray(received) && received.includes(item);
        check(pass, `expected ${fmt(received)}${not} to contain ${fmt(item)}`, item);
      },
      toHaveLength(length: number) {
        const actual =
          isObject(received) || typeof received === 'string'
            ? (received as { length?: unknown }).length
            : undefined;
        if (!negate && typeof actual !== 'number') {
          throw new AssertionError(
            `expected ${fmt(received)} to have a length`,
            fmt(length),
            fmt(actual),
          );
        }
        const pass = actual === length;
        if (pass === negate) {
          throw new AssertionError(
            `expected length${not} to be ${length}, got ${fmt(actual)}`,
            fmt(length),
            fmt(actual),
          );
        }
      },
      toBeTruthy() {
        check(Boolean(received), `expected ${fmt(received)}${not} to be truthy`);
      },
      toBeFalsy() {
        check(!received, `expected ${fmt(received)}${not} to be falsy`);
      },
      toBeNull() {
        check(received === null, `expected ${fmt(received)}${not} to be null`, null);
      },
      toBeUndefined() {
        check(received === undefined, `expected ${fmt(received)}${not} to be undefined`);
      },
      toBeDefined() {
        check(received !== undefined, `expected value${not} to be defined`);
      },
      toBeCloseTo(expected: number, digits = 2) {
        const pass =
          typeof received === 'number' && Math.abs(received - expected) < Math.pow(10, -digits) / 2;
        check(pass, `expected ${fmt(received)}${not} to be close to ${fmt(expected)}`, expected);
      },
      toBeGreaterThan(n: number) {
        check(
          typeof received === 'number' && received > n,
          `expected ${fmt(received)}${not} to be greater than ${n}`,
        );
      },
      toBeLessThan(n: number) {
        check(
          typeof received === 'number' && received < n,
          `expected ${fmt(received)}${not} to be less than ${n}`,
        );
      },
      toThrow(expected?: unknown) {
        if (typeof received !== 'function') {
          throw new AssertionError('toThrow() needs a function: expect(() => fn()).toThrow()');
        }
        let thrown: unknown;
        let didThrow = false;
        try {
          received();
        } catch (e) {
          didThrow = true;
          thrown = e;
        }
        const message =
          isObject(thrown) && typeof thrown.message === 'string' ? thrown.message : String(thrown);
        let pass = didThrow;
        if (didThrow && typeof expected === 'string') pass = message.includes(expected);
        else if (didThrow && expected instanceof RegExp) pass = expected.test(message);
        else if (didThrow && typeof expected === 'function') pass = thrown instanceof expected;
        const what = expected === undefined ? '' : ' ' + fmt(expected);
        if (pass === negate) {
          throw new AssertionError(
            didThrow
              ? `expected function${not} to throw${what}, but it threw "${message}"`
              : `expected function${not} to throw${what}, but it did not throw`,
          );
        }
      },
    };
  };

  const expect = (received: unknown) => {
    const matchers = makeMatchers(received, false);
    return Object.assign(matchers, { not: makeMatchers(received, true) });
  };

  g.describe = describe;
  g.test = test;
  g.it = test;
  g.expect = expect;

  return async () => {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    for (const t of tests) {
      if (t.skip) {
        skipped++;
        send({ type: 'test', name: t.name, suite: t.suite, status: 'skip' });
        continue;
      }
      try {
        await t.fn();
        passed++;
        send({ type: 'test', name: t.name, suite: t.suite, status: 'pass' });
      } catch (e) {
        // The runner's own "stop" signal (output limit) must end the whole run.
        if (isObject(e) && e.__stop === true) throw e;
        failed++;
        if (e instanceof AssertionError) {
          send({
            type: 'test',
            name: t.name,
            suite: t.suite,
            status: 'fail',
            message: e.message,
            expected: e.expected,
            received: e.received,
          });
        } else {
          const text =
            isObject(e) && typeof e.message === 'string'
              ? (e.name || 'Error') + ': ' + e.message
              : fmt(e);
          send({
            type: 'test',
            name: t.name,
            suite: t.suite,
            status: 'fail',
            message: String(text),
          });
        }
      }
    }
    send({ type: 'tests-done', passed, failed, skipped });
  };
}
