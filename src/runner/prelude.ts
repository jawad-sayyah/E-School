import { formatLine } from './format';
import { installTestApi } from './testApi';
import type { Limits } from './limits';

export interface FetchMock {
  status?: number;
  body?: unknown;
  /** Milliseconds before the response arrives (defaults to the run's fetchDelay). */
  delay?: number;
  /** Simulate a network failure: fetch rejects with TypeError("Failed to fetch"). */
  networkError?: boolean;
}

/** Keys are a path ("/api/cart") or a method plus path ("POST /api/orders"). */
export type FetchMocks = Record<string, FetchMock>;

export const DEFAULT_FETCH_DELAY = 250;

export const DEFAULT_FETCH_MOCKS: FetchMocks = {
  '/api/cart': { body: [{ id: 1, name: 'Coffee', price: 4 }] },
  '/api/products': {
    body: [
      { id: 1, name: 'Coffee', price: 4 },
      { id: 2, name: 'Bagel', price: 3 },
      { id: 3, name: 'Muffin', price: 5 },
    ],
  },
  '/api/user': { body: { id: 7, name: 'Sara' } },
  'POST /api/orders': { status: 201, body: { id: 1001, status: 'received' } },
};

/**
 * The student's code followed by the tests in their own { } block: tests can call the
 * student's functions, and test helpers (e.g. `const cart`) shadow the student's
 * names instead of clashing with them.
 */
export function joinWithTests(code: string, tests: string): string {
  return `${code}\n;\n{\n${tests}\n}`;
}

export interface SourceOptions {
  limits: Limits;
  fetchMocks?: FetchMocks;
  fetchDelay?: number;
  /** Test code to run after the student's code (exercise mode). */
  tests?: string;
}

/**
 * Builds the full worker script: prelude + student code wrapped in an async IIFE,
 * so top-level await works. Protocol (worker → page):
 *   { type: 'line', level, text }   a console line
 *   { type: 'limit' }               MAX_LINES exceeded; the page terminates the worker
 *   { type: 'settled' }             the main code finished (timers may still run)
 *   { type: 'idle' }                main code finished and no timers are left
 *   { type: 'test' | 'tests-done' } exercise results
 */
export function buildWorkerSource(code: string, options: SourceOptions): string {
  const mocks = { ...DEFAULT_FETCH_MOCKS, ...options.fetchMocks };
  const delay = options.fetchDelay ?? DEFAULT_FETCH_DELAY;
  const testMode = typeof options.tests === 'string';

  const prelude = `const __L = ${JSON.stringify(options.limits)};
const __fmtLine = (${formatLine.toString()});
const __postMessage = self.postMessage.bind(self);
const __send = (msg) => __postMessage(msg);
const __def = (name, value) =>
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });

let __count = 0, __stopped = false, __settled = false, __idleSent = false;
class __Stop extends Error {
  constructor() { super("stopped"); this.__stop = true; }
}
const __emit = (level, args) => {
  if (__stopped) throw new __Stop();
  if (++__count > __L.MAX_LINES) {
    __stopped = true;
    __send({ type: "limit" });
    throw new __Stop();
  }
  __send({ type: "line", level, text: __fmtLine(args, __L) });
};
const __describe = (e) =>
  e && typeof e === "object" && typeof e.message === "string"
    ? (e.name || "Error") + ": " + e.message
    : __fmtLine([e], __L);
const __report = (e) => {
  if (__stopped || (e && e.__stop)) return;
  try { __emit("error", ["Uncaught " + __describe(e)]); } catch (_) {}
};

/* console */
const __counts = new Map();
const __timersByLabel = new Map();
__def("console", {
  log: (...a) => __emit("log", a),
  info: (...a) => __emit("info", a),
  debug: (...a) => __emit("log", a),
  trace: (...a) => __emit("log", a),
  table: (...a) => __emit("log", a),
  dir: (v) => __emit("log", [v]),
  warn: (...a) => __emit("warn", a),
  error: (...a) => __emit("error", a),
  group: (...a) => { if (a.length) __emit("log", a); },
  groupCollapsed: (...a) => { if (a.length) __emit("log", a); },
  groupEnd: () => {},
  clear: () => {},
  assert: (ok, ...a) => { if (!ok) __emit("error", ["Assertion failed" + (a.length ? ":" : ""), ...a]); },
  count: (label = "default") => {
    const n = (__counts.get(label) || 0) + 1;
    __counts.set(label, n);
    __emit("log", [label + ": " + n]);
  },
  time: (label = "default") => { __timersByLabel.set(label, performance.now()); },
  timeEnd: (label = "default") => {
    const start = __timersByLabel.get(label);
    if (start !== undefined) __emit("log", [label + ": " + (performance.now() - start).toFixed(1) + " ms"]);
  },
});

/* timers: tracked, so the page knows when nothing is left to run */
const __st = setTimeout, __ct = clearTimeout, __si = setInterval, __ci = clearInterval;
const __timers = new Set();
const __checkIdle = () => {
  if (__settled && !__stopped && !__idleSent && __timers.size === 0) {
    __idleSent = true;
    __send({ type: "idle" });
  }
};
const __scheduleIdleCheck = () => { __st(__checkIdle, 0); };
const __setTimeout = (fn, ms, ...args) => {
  const id = __st(() => {
    __timers.delete(id);
    try { if (typeof fn === "function") fn(...args); } catch (e) { __report(e); }
    __scheduleIdleCheck();
  }, ms);
  __timers.add(id);
  return id;
};
__def("setTimeout", __setTimeout);
__def("clearTimeout", (id) => { __timers.delete(id); __ct(id); __scheduleIdleCheck(); });
__def("setInterval", (fn, ms, ...args) => {
  const id = __si(() => {
    try { if (typeof fn === "function") fn(...args); } catch (e) { __report(e); }
  }, ms);
  __timers.add(id);
  return id;
});
__def("clearInterval", (id) => { __timers.delete(id); __ci(id); __scheduleIdleCheck(); });

/* simulated fetch */
const __mocks = ${JSON.stringify(mocks)};
const __fetchDelay = ${JSON.stringify(delay)};
const __clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
__def("fetch", (input, init) => new Promise((resolve, reject) => {
  const url = typeof input === "string" ? input : input && input.url ? input.url : String(input);
  const method = String((init && init.method) || "GET").toUpperCase();
  let path = url;
  try { path = new URL(url, "https://shop.example").pathname; } catch (_) {}
  const mock = __mocks[method + " " + path] || __mocks[method + " " + url] ||
    (method === "GET" ? __mocks[url] || __mocks[path] : undefined);
  __setTimeout(() => {
    if (mock && mock.networkError) { reject(new TypeError("Failed to fetch")); return; }
    const status = mock ? mock.status || 200 : 404;
    const body = mock ? mock.body : { error: "Not found" };
    resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 404 ? "Not Found" : status >= 400 ? "Error" : "OK",
      url,
      headers: { get: (h) => (String(h).toLowerCase() === "content-type" ? "application/json" : null) },
      json: async () => __clone(body),
      text: async () => JSON.stringify(__clone(body)),
    });
  }, mock && typeof mock.delay === "number" ? mock.delay : __fetchDelay);
}));

/* in-memory localStorage */
const __store = new Map();
__def("localStorage", {
  getItem: (k) => (__store.has(String(k)) ? __store.get(String(k)) : null),
  setItem: (k, v) => { __store.set(String(k), String(v)); },
  removeItem: (k) => { __store.delete(String(k)); },
  clear: () => { __store.clear(); },
  key: (i) => [...__store.keys()][i] ?? null,
  get length() { return __store.size; },
});

self.addEventListener("unhandledrejection", (ev) => {
  if (ev.preventDefault) ev.preventDefault();
  __report(ev.reason);
});
${
  testMode
    ? `const __runTests = (${installTestApi.toString()})(globalThis, __send, (v) => __fmtLine([v], __L, true));`
    : ''
}
`;

  const onSuccess = testMode ? '() => __runTests()' : 'undefined';
  const onFailure = testMode
    ? '(e) => { __report(e); __send({ type: "tests-done", passed: 0, failed: 0, skipped: 0, crashed: true }); }'
    : '(e) => { __report(e); }';

  // No "use strict": the student's code runs like a classic <script>.
  return `${prelude}
(async function () {
${testMode ? joinWithTests(code, options.tests ?? '') : code}
})()
  .then(${onSuccess}, ${onFailure})
  .catch(__report)
  .finally(() => {
    __settled = true;
    if (!__stopped) __send({ type: "settled" });
    __scheduleIdleCheck();
  });
`;
}
