// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { createNodeWorker } from '../../test/nodeWorker';
import { checkExercise } from './checkExercise';

const options = { createWorker: createNodeWorker, limits: { MAX_MS: 3000 } };

/** Runs student-style tests (with optional code) and returns name → status. */
async function run(tests: string, code = '') {
  const check = await checkExercise(code, tests, options);
  return {
    check,
    status: Object.fromEntries(check.results.map((r) => [r.name, r.status])),
    messages: Object.fromEntries(check.results.map((r) => [r.name, r.message ?? ''])),
  };
}

describe('mocks', () => {
  test('vi.fn records calls and supports the call matchers', async () => {
    const { check, status } = await run(`
      test("calls", () => {
        const onAdd = vi.fn();
        onAdd("Tea", 2);
        onAdd("Coffee", 1);
        expect(onAdd).toHaveBeenCalled();
        expect(onAdd).toHaveBeenCalledTimes(2);
        expect(onAdd).toHaveBeenCalledWith("Tea", 2);
        expect(onAdd).toHaveBeenLastCalledWith("Coffee", 1);
        expect(onAdd).not.toHaveBeenCalledWith("Cake", 1);
        expect(onAdd.mock.calls[0]).toEqual(["Tea", 2]);
      });
      test("implementations", async () => {
        const price = vi.fn().mockReturnValueOnce(4).mockReturnValue(2);
        expect(price()).toBe(4);
        expect(price()).toBe(2);
        const load = vi.fn().mockResolvedValue({ ok: true });
        await expect(load()).resolves.toEqual({ ok: true });
        const fail = vi.fn().mockRejectedValue(new Error("down"));
        await expect(fail()).rejects.toThrow("down");
        expect(vi.fn((a, b) => a + b)(2, 3)).toBe(5);
      });
      test("asymmetric matchers", () => {
        const track = vi.fn();
        track("add", { id: 7, at: Date.now() });
        expect(track).toHaveBeenCalledWith("add", expect.objectContaining({ id: 7 }));
        expect(track).toHaveBeenCalledWith(expect.any(String), { id: 7, at: expect.any(Number) });
      });
      test("a wrong count fails", () => {
        const f = vi.fn();
        f();
        expect(f).toHaveBeenCalledTimes(2);
      });
    `);
    expect(status).toEqual({
      calls: 'pass',
      implementations: 'pass',
      'asymmetric matchers': 'pass',
      'a wrong count fails': 'fail',
    });
    expect(check.results[3].message).toContain('called 2 times, but it was called 1 time');
  });

  test('vi.spyOn and vi.stubGlobal are restored after each test', async () => {
    const { status } = await run(`
      const cart = { total: () => 10 };
      test("spy", () => {
        const spy = vi.spyOn(cart, "total").mockReturnValue(99);
        expect(cart.total()).toBe(99);
        expect(spy).toHaveBeenCalledTimes(1);
      });
      test("restored", () => {
        expect(cart.total()).toBe(10);
      });
      test("stub fetch", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ["Tea"] }));
        const res = await fetch("/api/products");
        expect(await res.json()).toEqual(["Tea"]);
      });
      test("fetch restored", () => {
        expect(vi.isMockFunction(globalThis.fetch)).toBe(false);
      });
    `);
    expect(status).toEqual({
      spy: 'pass',
      restored: 'pass',
      'stub fetch': 'pass',
      'fetch restored': 'pass',
    });
  });
});

describe('fake timers', () => {
  test('advanceTimersByTime runs due timers in order, without waiting', async () => {
    const started = Date.now();
    const { status } = await run(
      `
      test("debounce", () => {
        vi.useFakeTimers();
        const save = vi.fn();
        const debounced = debounce(save, 500);
        debounced("a");
        debounced("b");
        vi.advanceTimersByTime(499);
        expect(save).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(save).toHaveBeenCalledTimes(1);
        expect(save).toHaveBeenCalledWith("b");
      });
      test("intervals and Date.now", () => {
        vi.useFakeTimers();
        vi.setSystemTime(1000);
        const ticks = [];
        const id = setInterval(() => ticks.push(Date.now()), 100);
        vi.advanceTimersByTime(350);
        clearInterval(id);
        vi.runAllTimers();
        expect(ticks).toEqual([1100, 1200, 1300]);
      });
      test("a one-hour timer", () => {
        vi.useFakeTimers();
        let done = false;
        setTimeout(() => { done = true; }, 60 * 60 * 1000);
        expect(vi.getTimerCount()).toBe(1);
        vi.runAllTimers();
        expect(done).toBe(true);
      });
      test("real timers are back", async () => {
        await new Promise((r) => setTimeout(r, 5));
        expect(vi.getTimerCount()).toBe(0);
      });
    `,
      'function debounce(fn, ms) {\n  let id;\n  return (...args) => {\n    clearTimeout(id);\n    id = setTimeout(() => fn(...args), ms);\n  };\n}',
    );
    expect(status).toEqual({
      debounce: 'pass',
      'intervals and Date.now': 'pass',
      'a one-hour timer': 'pass',
      'real timers are back': 'pass',
    });
    expect(Date.now() - started).toBeLessThan(2500);
  });
});

describe('hooks and matchers', () => {
  test('beforeEach / afterEach / beforeAll / afterAll respect describe blocks', async () => {
    const { status, check } = await run(`
      const log = [];
      beforeAll(() => log.push("all"));
      beforeEach(() => log.push("each"));
      describe("cart", () => {
        let cart;
        beforeEach(() => { cart = []; log.push("cart"); });
        afterEach(() => log.push("after cart"));
        test("starts empty", () => { cart.push(1); expect(cart).toHaveLength(1); });
        test("fresh each time", () => { expect(cart).toHaveLength(0); });
      });
      test("order of hooks", () => {
        expect(log).toEqual(["all", "each", "cart", "after cart", "each", "cart", "after cart", "each"]);
      });
    `);
    expect(check.passed).toBe(true);
    expect(status['order of hooks']).toBe('pass');
  });

  test('more matchers', async () => {
    const { check } = await run(`
      test("matchers", () => {
        expect("Iced coffee").toMatch(/coffee/);
        expect({ id: 1, name: "Tea", price: 2 }).toMatchObject({ name: "Tea" });
        expect([{ id: 1 }, { id: 2 }]).toContainEqual({ id: 2 });
        expect({ a: { b: 3 } }).toHaveProperty("a.b", 3);
        expect(new Date(0)).toBeInstanceOf(Date);
        expect(Number("x")).toBeNaN();
        expect(5).toBeGreaterThanOrEqual(5);
        expect(4).toBeLessThanOrEqual(5);
      });
    `);
    expect(check.passed).toBe(true);
  });
});
