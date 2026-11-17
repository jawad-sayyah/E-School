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
 * Installs a Vitest-shaped test API on `g` and returns a function that runs every
 * registered test in order:
 * - describe / test / it (with .skip and .todo), beforeEach / afterEach / beforeAll / afterAll
 * - expect(x) with .not, .resolves, .rejects, and the common matchers
 * - vi.fn / vi.spyOn mocks and their matchers, vi.stubGlobal
 * - fake timers: vi.useFakeTimers, vi.advanceTimersByTime, vi.runAllTimers, vi.setSystemTime
 * Timers, global stubs and spies are restored automatically after every test.
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
  type Hook = { suite: string[]; fn: TestFn };
  const tests: { name: string; suite: string[]; fn: TestFn; skip: boolean }[] = [];
  const hooks = {
    beforeEach: [] as Hook[],
    afterEach: [] as Hook[],
    beforeAll: [] as Hook[],
    afterAll: [] as Hook[],
  };
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

  /** expect.any(Number) and friends compare by a predicate instead of by value. */
  const ASYMMETRIC = '__asymmetricMatch';
  const isAsymmetric = (v: unknown): v is Record<string, (x: unknown) => boolean> =>
    isObject(v) && typeof v[ASYMMETRIC] === 'function';

  const equals = (a: unknown, b: unknown, seen: unknown[]): boolean => {
    if (isAsymmetric(b)) return b[ASYMMETRIC](a);
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

  /** toMatchObject: every property of `b` must match in `a` (extra properties in `a` are fine). */
  const matchesObject = (a: unknown, b: unknown): boolean => {
    if (isAsymmetric(b)) return b[ASYMMETRIC](a);
    if (Array.isArray(b)) {
      return Array.isArray(a) && a.length === b.length && b.every((v, i) => matchesObject(a[i], v));
    }
    if (isObject(b) && !(b instanceof Date) && !(b instanceof RegExp)) {
      if (!isObject(a)) return false;
      return Object.keys(b).every((k) => k in a && matchesObject(a[k], b[k]));
    }
    return equals(a, b, []);
  };

  /* ── describe / test / hooks ─────────────────────────────────────────────── */

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

  const addHook = (kind: keyof typeof hooks) => (fn: TestFn) => {
    hooks[kind].push({ suite: [...suite], fn });
  };
  /** A hook applies to a test when the hook's describe path is a prefix of the test's. */
  const appliesTo = (hook: Hook, testSuite: string[]) =>
    hook.suite.every((name, i) => testSuite[i] === name);

  /* ── mocks ────────────────────────────────────────────────────────────────── */

  type MockResult = { type: 'return' | 'throw'; value: unknown };
  type Mock = ((...args: unknown[]) => unknown) & {
    _isMockFunction: true;
    mock: { calls: unknown[][]; results: MockResult[]; lastCall?: unknown[] };
    [key: string]: unknown;
  };
  const restoreAfterTest: (() => void)[] = [];
  const allMocks: Mock[] = [];

  const fn = (impl?: (...args: unknown[]) => unknown): Mock => {
    let implementation = impl;
    const once: ((...args: unknown[]) => unknown)[] = [];
    const mockFn = function (this: unknown, ...args: unknown[]) {
      mockFn.mock.calls.push(args);
      mockFn.mock.lastCall = args;
      const current = once.length ? once.shift() : implementation;
      try {
        const value = current ? current.apply(this, args) : undefined;
        mockFn.mock.results.push({ type: 'return', value });
        return value;
      } catch (e) {
        mockFn.mock.results.push({ type: 'throw', value: e });
        throw e;
      }
    } as Mock;
    mockFn._isMockFunction = true;
    mockFn.mock = { calls: [], results: [] };
    mockFn.mockImplementation = (i: (...args: unknown[]) => unknown) => {
      implementation = i;
      return mockFn;
    };
    mockFn.mockImplementationOnce = (i: (...args: unknown[]) => unknown) => {
      once.push(i);
      return mockFn;
    };
    mockFn.mockReturnValue = (v: unknown) => {
      implementation = () => v;
      return mockFn;
    };
    mockFn.mockReturnValueOnce = (v: unknown) => {
      once.push(() => v);
      return mockFn;
    };
    mockFn.mockResolvedValue = (v: unknown) => {
      implementation = () => Promise.resolve(v);
      return mockFn;
    };
    mockFn.mockResolvedValueOnce = (v: unknown) => {
      once.push(() => Promise.resolve(v));
      return mockFn;
    };
    mockFn.mockRejectedValue = (e: unknown) => {
      implementation = () => Promise.reject(e);
      return mockFn;
    };
    mockFn.mockRejectedValueOnce = (e: unknown) => {
      once.push(() => Promise.reject(e));
      return mockFn;
    };
    mockFn.mockClear = () => {
      mockFn.mock.calls = [];
      mockFn.mock.results = [];
      mockFn.mock.lastCall = undefined;
      return mockFn;
    };
    mockFn.mockReset = () => {
      (mockFn.mockClear as () => void)();
      implementation = undefined;
      once.length = 0;
      return mockFn;
    };
    mockFn.mockRestore = () => {
      (mockFn.mockReset as () => void)();
    };
    allMocks.push(mockFn);
    return mockFn;
  };

  const spyOn = (object: Record<string, unknown>, method: string) => {
    const original = object[method];
    if (typeof original !== 'function') {
      throw new Error(`vi.spyOn: ${method} is not a function`);
    }
    const spy = fn((...args: unknown[]) =>
      (original as (...a: unknown[]) => unknown).apply(object, args),
    );
    const restore = () => {
      object[method] = original;
    };
    spy.mockRestore = () => {
      (spy.mockReset as () => void)();
      restore();
    };
    object[method] = spy;
    restoreAfterTest.push(restore);
    return spy;
  };

  const stubGlobal = (name: string, value: unknown) => {
    const had = Object.prototype.hasOwnProperty.call(g, name);
    const previous = g[name];
    g[name] = value;
    restoreAfterTest.push(() => {
      if (had) g[name] = previous;
      else delete g[name];
    });
  };

  /* ── fake timers ──────────────────────────────────────────────────────────── */

  type FakeTimer = { id: number; at: number; fn: () => void; every?: number };
  const real = {
    setTimeout: g.setTimeout,
    clearTimeout: g.clearTimeout,
    setInterval: g.setInterval,
    clearInterval: g.clearInterval,
    now: Date.now,
  };
  let clock: { now: number; nextId: number; timers: FakeTimer[] } | null = null;

  const schedule = (callback: unknown, delay: unknown, every: boolean, args: unknown[]) => {
    if (!clock) throw new Error('fake timers are off');
    const ms = Math.max(0, Number(delay) || 0);
    const id = clock.nextId++;
    clock.timers.push({
      id,
      at: clock.now + ms,
      fn: () => (callback as (...a: unknown[]) => void)(...args),
      every: every ? Math.max(1, ms) : undefined,
    });
    return id;
  };
  const cancel = (id: unknown) => {
    if (clock) clock.timers = clock.timers.filter((t) => t.id !== id);
  };

  const enableFakeTimers = () => {
    if (clock) return vi;
    clock = { now: real.now.call(Date), nextId: 1, timers: [] };
    g.setTimeout = (cb: unknown, ms?: unknown, ...args: unknown[]) => schedule(cb, ms, false, args);
    g.setInterval = (cb: unknown, ms?: unknown, ...args: unknown[]) => schedule(cb, ms, true, args);
    g.clearTimeout = cancel;
    g.clearInterval = cancel;
    Date.now = () => (clock ? clock.now : real.now.call(Date));
    return vi;
  };
  const disableFakeTimers = () => {
    if (!clock) return vi;
    clock = null;
    g.setTimeout = real.setTimeout;
    g.setInterval = real.setInterval;
    g.clearTimeout = real.clearTimeout;
    g.clearInterval = real.clearInterval;
    Date.now = real.now;
    return vi;
  };

  /** Runs due timers in time order until `until` (or until none are left). */
  const runTimers = (until: number) => {
    if (!clock) throw new Error('Call vi.useFakeTimers() first.');
    for (let i = 0; i < 10000; i++) {
      const due = clock.timers
        .filter((t) => t.at <= until)
        .sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      clock.now = due.at;
      if (due.every) due.at += due.every;
      else clock.timers = clock.timers.filter((t) => t !== due);
      due.fn();
    }
    if (until !== Infinity) clock.now = Math.max(clock.now, until);
  };

  const vi = {
    fn,
    spyOn,
    stubGlobal,
    isMockFunction: (f: unknown) => typeof f === 'function' && (f as Mock)._isMockFunction === true,
    clearAllMocks: () => allMocks.forEach((m) => (m.mockClear as () => void)()),
    resetAllMocks: () => allMocks.forEach((m) => (m.mockReset as () => void)()),
    restoreAllMocks: () => {
      while (restoreAfterTest.length) restoreAfterTest.pop()?.();
    },
    useFakeTimers: enableFakeTimers,
    useRealTimers: disableFakeTimers,
    advanceTimersByTime: (ms: number) => {
      if (!clock) throw new Error('Call vi.useFakeTimers() first.');
      runTimers(clock.now + ms);
      return vi;
    },
    runAllTimers: () => {
      runTimers(Infinity);
      return vi;
    },
    runOnlyPendingTimers: () => {
      if (!clock) throw new Error('Call vi.useFakeTimers() first.');
      const pending = new Set(clock.timers.map((t) => t.id));
      const last = Math.max(clock.now, ...clock.timers.map((t) => t.at));
      for (
        let i = 0;
        i < 10000 && clock.timers.some((t) => pending.has(t.id) && t.at <= last);
        i++
      ) {
        const due = clock.timers
          .filter((t) => pending.has(t.id))
          .sort((a, b) => a.at - b.at || a.id - b.id)[0];
        clock.now = due.at;
        clock.timers = clock.timers.filter((t) => t !== due);
        pending.delete(due.id);
        due.fn();
      }
      return vi;
    },
    getTimerCount: () => (clock ? clock.timers.length : 0),
    setSystemTime: (time: number | Date) => {
      if (!clock) throw new Error('Call vi.useFakeTimers() first.');
      clock.now = typeof time === 'number' ? time : time.getTime();
      return vi;
    },
  };

  /* ── expect ───────────────────────────────────────────────────────────────── */

  const mockOf = (received: unknown, matcher: string) => {
    if (typeof received !== 'function' || (received as Mock)._isMockFunction !== true) {
      throw new AssertionError(
        `${matcher}() needs a mock function: expect(vi.fn()).${matcher}(…). Received ${fmt(received)}`,
      );
    }
    return received as Mock;
  };
  const calledTimes = (n: number) => `${n} time${n === 1 ? '' : 's'}`;

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
    const num = (n: unknown) => typeof n === 'number';
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
      toStrictEqual(expected: unknown) {
        check(
          equals(received, expected, []),
          `expected ${fmt(received)}${not} to strictly equal ${fmt(expected)}`,
          expected,
        );
      },
      toMatchObject(expected: unknown) {
        check(
          matchesObject(received, expected),
          `expected ${fmt(received)}${not} to match object ${fmt(expected)}`,
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
      toContainEqual(item: unknown) {
        const pass = Array.isArray(received) && received.some((x) => equals(x, item, []));
        check(
          pass,
          `expected ${fmt(received)}${not} to contain an item equal to ${fmt(item)}`,
          item,
        );
      },
      toMatch(pattern: unknown) {
        const text = String(received);
        const pass =
          typeof received === 'string' &&
          (pattern instanceof RegExp ? pattern.test(text) : text.includes(String(pattern)));
        check(pass, `expected ${fmt(received)}${not} to match ${fmt(pattern)}`, pattern);
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
      toHaveProperty(path: string | string[], ...value: unknown[]) {
        const keys = Array.isArray(path) ? path : String(path).split('.');
        let current: unknown = received;
        let found = true;
        for (const k of keys) {
          if (isObject(current) && k in current) current = current[k];
          else {
            found = false;
            break;
          }
        }
        const pass = found && (value.length === 0 || equals(current, value[0], []));
        check(
          pass,
          `expected ${fmt(received)}${not} to have property ${keys.join('.')}` +
            (value.length ? ` equal to ${fmt(value[0])}` : ''),
        );
      },
      toBeInstanceOf(ctor: new (...args: unknown[]) => unknown) {
        check(
          received instanceof ctor,
          `expected ${fmt(received)}${not} to be an instance of ${ctor?.name ?? fmt(ctor)}`,
        );
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
      toBeNaN() {
        check(Number.isNaN(received), `expected ${fmt(received)}${not} to be NaN`);
      },
      toBeCloseTo(expected: number, digits = 2) {
        const pass =
          num(received) && Math.abs((received as number) - expected) < Math.pow(10, -digits) / 2;
        check(pass, `expected ${fmt(received)}${not} to be close to ${fmt(expected)}`, expected);
      },
      toBeGreaterThan(n: number) {
        check(
          num(received) && (received as number) > n,
          `expected ${fmt(received)}${not} to be greater than ${n}`,
        );
      },
      toBeGreaterThanOrEqual(n: number) {
        check(
          num(received) && (received as number) >= n,
          `expected ${fmt(received)}${not} to be >= ${n}`,
        );
      },
      toBeLessThan(n: number) {
        check(
          num(received) && (received as number) < n,
          `expected ${fmt(received)}${not} to be less than ${n}`,
        );
      },
      toBeLessThanOrEqual(n: number) {
        check(
          num(received) && (received as number) <= n,
          `expected ${fmt(received)}${not} to be <= ${n}`,
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
      toHaveBeenCalled() {
        const m = mockOf(received, 'toHaveBeenCalled');
        check(
          m.mock.calls.length > 0,
          `expected the mock${not} to have been called, but it was called ${calledTimes(m.mock.calls.length)}`,
        );
      },
      toHaveBeenCalledTimes(n: number) {
        const m = mockOf(received, 'toHaveBeenCalledTimes');
        const count = m.mock.calls.length;
        if ((count === n) === negate) {
          throw new AssertionError(
            `expected the mock${not} to have been called ${calledTimes(n)}, but it was called ${calledTimes(count)}`,
            String(n),
            String(count),
          );
        }
      },
      toHaveBeenCalledWith(...args: unknown[]) {
        const m = mockOf(received, 'toHaveBeenCalledWith');
        const pass = m.mock.calls.some((call) => equals(call, args, []));
        if (pass === negate) {
          throw new AssertionError(
            `expected the mock${not} to have been called with ${fmt(args)}`,
            fmt(args),
            m.mock.calls.length ? m.mock.calls.map((c) => fmt(c)).join(', ') : 'no calls',
          );
        }
      },
      toHaveBeenLastCalledWith(...args: unknown[]) {
        const m = mockOf(received, 'toHaveBeenLastCalledWith');
        const last = m.mock.calls[m.mock.calls.length - 1];
        const pass = last !== undefined && equals(last, args, []);
        if (pass === negate) {
          throw new AssertionError(
            `expected the last call${not} to be with ${fmt(args)}`,
            fmt(args),
            last ? fmt(last) : 'no calls',
          );
        }
      },
      toHaveReturnedWith(value: unknown) {
        const m = mockOf(received, 'toHaveReturnedWith');
        const pass = m.mock.results.some((r) => r.type === 'return' && equals(r.value, value, []));
        check(pass, `expected the mock${not} to have returned ${fmt(value)}`, value);
      },
    };
  };

  type Matchers = ReturnType<typeof makeMatchers>;

  /** expect(promise).resolves / .rejects: every matcher becomes async. */
  const asyncMatchers = (promise: unknown, mode: 'resolves' | 'rejects', negate: boolean) => {
    const out: Record<string, (...args: unknown[]) => Promise<void>> = {};
    for (const name of Object.keys(makeMatchers(undefined, false))) {
      out[name] = async (...args: unknown[]) => {
        let value: unknown;
        try {
          value = await promise;
          if (mode === 'rejects') {
            throw new AssertionError(
              `expected the promise to reject, but it resolved with ${fmt(value)}`,
            );
          }
        } catch (e) {
          if (e instanceof AssertionError) throw e;
          if (mode === 'resolves') {
            throw new AssertionError(
              `expected the promise to resolve, but it rejected with ${fmt(e)}`,
            );
          }
          // rejects.toThrow("msg") checks the rejection reason like a thrown error
          value =
            name === 'toThrow'
              ? () => {
                  throw e;
                }
              : e;
        }
        (makeMatchers(value, negate) as unknown as Record<string, (...a: unknown[]) => void>)[name](
          ...args,
        );
      };
    }
    return out;
  };

  const expect = (received: unknown) => {
    const matchers = makeMatchers(received, false);
    const resolves = asyncMatchers(received, 'resolves', false);
    const rejects = asyncMatchers(received, 'rejects', false);
    return Object.assign(matchers, {
      not: makeMatchers(received, true),
      resolves: Object.assign(resolves, { not: asyncMatchers(received, 'resolves', true) }),
      rejects: Object.assign(rejects, { not: asyncMatchers(received, 'rejects', true) }),
    }) as Matchers & Record<string, unknown>;
  };
  expect.any = (ctor: unknown) => ({
    [ASYMMETRIC]: (v: unknown) =>
      ctor === Number
        ? typeof v === 'number' || v instanceof Number
        : ctor === String
          ? typeof v === 'string' || v instanceof String
          : ctor === Boolean
            ? typeof v === 'boolean'
            : ctor === Function
              ? typeof v === 'function'
              : typeof ctor === 'function' && v instanceof (ctor as new () => unknown),
    toString: () => `Any<${(ctor as { name?: string })?.name ?? '?'}>`,
  });
  expect.anything = () => ({
    [ASYMMETRIC]: (v: unknown) => v !== null && v !== undefined,
    toString: () => 'Anything',
  });
  expect.objectContaining = (shape: unknown) => ({
    [ASYMMETRIC]: (v: unknown) => matchesObject(v, shape),
    toString: () => `ObjectContaining ${fmt(shape)}`,
  });
  expect.stringContaining = (text: string) => ({
    [ASYMMETRIC]: (v: unknown) => typeof v === 'string' && v.includes(text),
    toString: () => `StringContaining "${text}"`,
  });

  g.describe = describe;
  g.test = test;
  g.it = test;
  g.expect = expect;
  g.vi = vi;
  g.beforeEach = addHook('beforeEach');
  g.afterEach = addHook('afterEach');
  g.beforeAll = addHook('beforeAll');
  g.afterAll = addHook('afterAll');

  const cleanUp = () => {
    disableFakeTimers();
    while (restoreAfterTest.length) restoreAfterTest.pop()?.();
  };

  return async () => {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const ranBeforeAll = new Set<Hook>();
    const ranAfterAll = new Set<Hook>();
    const runnable = tests.filter((t) => !t.skip);

    for (const t of tests) {
      if (t.skip) {
        skipped++;
        send({ type: 'test', name: t.name, suite: t.suite, status: 'skip' });
        continue;
      }
      try {
        for (const h of hooks.beforeAll) {
          if (!ranBeforeAll.has(h) && appliesTo(h, t.suite)) {
            ranBeforeAll.add(h);
            await h.fn();
          }
        }
        try {
          for (const h of hooks.beforeEach) if (appliesTo(h, t.suite)) await h.fn();
          await t.fn();
        } finally {
          for (const h of [...hooks.afterEach].reverse()) if (appliesTo(h, t.suite)) await h.fn();
          cleanUp();
        }
        passed++;
        send({ type: 'test', name: t.name, suite: t.suite, status: 'pass' });
      } catch (e) {
        cleanUp();
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
      // afterAll hooks run once the last test they apply to has finished.
      const remaining = runnable.slice(runnable.indexOf(t) + 1);
      for (const h of hooks.afterAll) {
        if (
          !ranAfterAll.has(h) &&
          appliesTo(h, t.suite) &&
          !remaining.some((r) => appliesTo(h, r.suite))
        ) {
          ranAfterAll.add(h);
          try {
            await h.fn();
          } catch {
            // an afterAll failure doesn't change test results
          }
        }
      }
    }
    send({ type: 'tests-done', passed, failed, skipped });
  };
}
