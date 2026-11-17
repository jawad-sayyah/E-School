// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { createNodeWorker } from '../../test/nodeWorker';
import { findSyntaxError, runCode, runToEnd, type RunOptions } from './runCode';
import { LIMITS } from './limits';

/** Short limits keep the suite fast; the logic is the same as with the real ones. */
const FAST = { MAX_MS: 1500, AFTER_MS: 400 };

const run = (code: string, options: Omit<RunOptions, 'onLines' | 'onDone'> = {}) =>
  runToEnd(code, {
    createWorker: createNodeWorker,
    ...options,
    limits: { ...FAST, ...options.limits },
  });

const texts = (lines: { text: string }[]) => lines.map((l) => l.text);

describe('runCode: output', () => {
  test('prints console.log lines in order', async () => {
    const out = await run('console.log("Coffee", 2);\nconsole.log([8, 6, 10]);');
    expect(out.status).toBe('done');
    expect(texts(out.lines)).toEqual(['Coffee 2', '[ 8, 6, 10 ]']);
  });

  test('marks warn and error levels', async () => {
    const out = await run('console.warn("careful"); console.error("bad");');
    expect(out.lines.map((l) => l.level)).toEqual(['warn', 'error']);
  });

  test('finishes as soon as the code is done (no AFTER_MS wait)', async () => {
    const started = Date.now();
    const out = await run('console.log(1)', { limits: { AFTER_MS: 3000, MAX_MS: 5000 } });
    expect(out.status).toBe('done');
    expect(Date.now() - started).toBeLessThan(2500);
  });

  test('reports uncaught errors as "Uncaught TypeError: …"', async () => {
    const out = await run('const user = {};\nconsole.log(user.address.city);');
    expect(out.lines).toEqual([
      {
        level: 'error',
        text: "Uncaught TypeError: Cannot read properties of undefined (reading 'city')",
      },
    ]);
  });

  test('reports errors thrown inside timers and rejected promises', async () => {
    const out = await run(
      'setTimeout(() => { throw new Error("late") }, 10);\nPromise.reject(new RangeError("nope"));',
    );
    expect(texts(out.lines).sort()).toEqual(['Uncaught Error: late', 'Uncaught RangeError: nope']);
  });

  test('student code is not in strict mode, like a classic script', async () => {
    const out = await run('total = 5;\nconsole.log(total);');
    expect(texts(out.lines)).toEqual(['5']);
  });
});

describe('runCode: syntax errors', () => {
  test('are reported without starting a worker', async () => {
    let created = 0;
    const out = await runToEnd('const x = ;', {
      createWorker: (src) => {
        created++;
        return createNodeWorker(src);
      },
    });
    expect(created).toBe(0);
    expect(out.syntaxError).toMatch(/^SyntaxError:/);
    expect(out.lines[0].text).toMatch(/^Uncaught SyntaxError:/);
  });

  test('code cannot break out of the async wrapper', () => {
    expect(findSyntaxError('}); console.log("escaped"); (async () => {')).toMatch(/SyntaxError/);
    expect(findSyntaxError('const a = await Promise.resolve(1);')).toBeNull();
  });
});

describe('runCode: async code and simulated fetch', () => {
  test('supports top-level await', async () => {
    const out = await run(
      'const wait = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));\n' +
        'const [a, b] = await Promise.all([wait(30, "cart loaded"), wait(50, "user loaded")]);\n' +
        'console.log(a, "+", b);',
    );
    expect(texts(out.lines)).toEqual(['cart loaded + user loaded']);
  });

  test('timers print after the main code, in order', async () => {
    const out = await run(
      'console.log("Order placed");\nsetTimeout(() => console.log("Order shipped!"), 50);\nconsole.log("Waiting…");',
    );
    expect(out.status).toBe('done');
    expect(out.timersStopped).toBe(false);
    expect(texts(out.lines)).toEqual(['Order placed', 'Waiting…', 'Order shipped!']);
  });

  test('fetch returns mock JSON after a delay', async () => {
    const started = Date.now();
    const out = await run(
      'const res = await fetch("/api/cart");\nconsole.log(res.ok, res.status);\nconsole.log(await res.json());',
    );
    expect(Date.now() - started).toBeGreaterThanOrEqual(200);
    expect(texts(out.lines)).toEqual(['true 200', "[ { id: 1, name: 'Coffee', price: 4 } ]"]);
  });

  test('fetch mocks are configurable, and unknown URLs give 404', async () => {
    const out = await run(
      'const a = await fetch("https://shop.example/api/stock?x=1");\nconsole.log(await a.json());\n' +
        'const b = await fetch("/api/missing");\nconsole.log(b.ok, b.status);',
      { fetchMocks: { '/api/stock': { body: { coffee: 5 }, delay: 10 } }, fetchDelay: 10 },
    );
    expect(texts(out.lines)).toEqual(['{ coffee: 5 }', 'false 404']);
  });

  test('fetch can simulate a network error', async () => {
    const out = await run(
      'try { await fetch("/api/cart") } catch (e) { console.log(e.name, e.message) }',
      { fetchMocks: { '/api/cart': { networkError: true, delay: 5 } } },
    );
    expect(texts(out.lines)).toEqual(['TypeError Failed to fetch']);
  });

  test('localStorage works in memory and stores strings', async () => {
    const out = await run(
      'localStorage.setItem("cart", JSON.stringify([{ name: "Coffee" }]));\n' +
        'console.log(JSON.parse(localStorage.getItem("cart")));\nconsole.log(localStorage.getItem("nope"));',
    );
    expect(texts(out.lines)).toEqual(["[ { name: 'Coffee' } ]", 'null']);
  });
});

describe('runCode: safety limits', () => {
  test('an infinite logging loop stops after MAX_LINES', async () => {
    const out = await run('let i = 0;\nwhile (true) console.log(i++);');
    expect(out.status).toBe('limit');
    expect(out.lines).toHaveLength(LIMITS.MAX_LINES);
    expect(out.lines.at(-1)?.text).toBe(String(LIMITS.MAX_LINES - 1));
  });

  test('the line limit still works when the loop is inside try/catch', async () => {
    const out = await run('while (true) {\n  try { console.log("hi") } catch (e) {}\n}');
    expect(out.status).toBe('limit');
    expect(out.lines).toHaveLength(LIMITS.MAX_LINES);
  });

  test('a silent while(true) is stopped after MAX_MS', async () => {
    const started = Date.now();
    const out = await run('while (true) {}');
    expect(out.status).toBe('timeout');
    expect(Date.now() - started).toBeLessThan(FAST.MAX_MS + 1500);
  });

  test('a setInterval that is never cleared stops AFTER_MS after the code ends', async () => {
    const out = await run('let n = 0;\nsetInterval(() => console.log("tick", ++n), 100);');
    expect(out.status).toBe('done');
    expect(out.timersStopped).toBe(true);
    expect(out.lines.length).toBeGreaterThan(1);
    expect(out.lines.length).toBeLessThan(10);
  });

  test('a cleared setInterval finishes normally', async () => {
    const out = await run(
      'let n = 0;\nconst id = setInterval(() => { console.log("Tick", ++n); if (n === 3) clearInterval(id); }, 20);',
    );
    expect(out.timersStopped).toBe(false);
    expect(texts(out.lines)).toEqual(['Tick 1', 'Tick 2', 'Tick 3']);
  });

  test('a 100k-character string is cut to MAX_CHARS', async () => {
    const out = await run('console.log("x".repeat(100000));');
    expect(out.lines[0].text).toBe('x'.repeat(LIMITS.MAX_CHARS) + ' … (98000 more characters)');
  });

  test('a 5,000-item array shows MAX_ITEMS items', async () => {
    const out = await run('console.log(Array.from({ length: 5000 }, (_, i) => i));');
    expect(out.lines[0].text).toMatch(/^\[ 0, 1, 2, .* 99, … 4900 more items \]$/);
  });

  test('cancelling a run terminates the worker', async () => {
    let terminated = false;
    const result = await new Promise<string>((resolve) => {
      const cancel = runCode('while (true) {}', {
        createWorker: (src) => {
          const w = createNodeWorker(src);
          const original = w.terminate.bind(w);
          w.terminate = () => {
            terminated = true;
            original();
          };
          return w;
        },
        onDone: (r) => resolve(r.status),
      });
      setTimeout(cancel, 100);
    });
    expect(result).toBe('cancelled');
    expect(terminated).toBe(true);
  });

  test('reports "unavailable" when no worker can be created', async () => {
    const out = await runToEnd('console.log(1)', {
      createWorker: () => {
        throw new Error('no workers');
      },
    });
    expect(out.status).toBe('unavailable');
  });
});
