// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { createNodeWorker } from '../../test/nodeWorker';
import { checkExercise } from './checkExercise';

const options = { createWorker: createNodeWorker, limits: { MAX_MS: 2000 } };

const TESTS = `
describe("getTotal", () => {
  test("empty cart is 0", () => {
    expect(getTotal([])).toBe(0);
  });
  test("one item", () => {
    expect(getTotal([{ name: "Coffee", price: 4, qty: 2 }])).toBe(8);
  });
  it("several items", () => {
    expect(getTotal([{ price: 4, qty: 2 }, { price: 3, qty: 1 }])).toBe(11);
  });
  test("decimal prices", () => {
    expect(getTotal([{ price: 1.1, qty: 3 }])).toBeCloseTo(3.3);
  });
});
`;

const SOLUTION = 'function getTotal(cart) {\n  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);\n}';

describe('checkExercise', () => {
  test('passes a correct solution', async () => {
    const check = await checkExercise(SOLUTION, TESTS, options);
    expect(check.passed).toBe(true);
    expect(check.counts).toEqual({ passed: 4, failed: 0, skipped: 0 });
    expect(check.results.map((r) => [r.suite, r.name, r.status])).toEqual([
      [['getTotal'], 'empty cart is 0', 'pass'],
      [['getTotal'], 'one item', 'pass'],
      [['getTotal'], 'several items', 'pass'],
      [['getTotal'], 'decimal prices', 'pass'],
    ]);
  });

  test('fails a wrong solution and shows expected vs received', async () => {
    const wrong = 'function getTotal(cart) {\n  return cart.reduce((sum, i) => sum + i.price, 0);\n}';
    const check = await checkExercise(wrong, TESTS, options);
    expect(check.passed).toBe(false);
    const failure = check.results.find((r) => r.name === 'one item');
    expect(failure).toMatchObject({ status: 'fail', expected: '8', received: '4' });
    expect(failure?.message).toBe('expected 4 to be 8');
    expect(check.counts.failed).toBe(3);
  });

  test('a missing function fails each test with a clear error', async () => {
    const check = await checkExercise('// nothing yet', TESTS, options);
    expect(check.passed).toBe(false);
    expect(check.results[0].message).toBe('ReferenceError: getTotal is not defined');
  });

  test('a syntax error is reported as a problem', async () => {
    const check = await checkExercise('function getTotal(cart) {', TESTS, options);
    expect(check.passed).toBe(false);
    expect(check.problem).toMatch(/syntax error/);
  });

  test('a crash before the tests is reported as a problem', async () => {
    const check = await checkExercise('throw new Error("oops")', TESTS, options);
    expect(check.passed).toBe(false);
    expect(check.problem).toBe('Your code crashed before the tests ran: Uncaught Error: oops');
  });

  test('an infinite loop times out instead of hanging', async () => {
    const check = await checkExercise('function getTotal() { while (true) {} }', TESTS, options);
    expect(check.passed).toBe(false);
    expect(check.status).toBe('timeout');
  });

  test('no tests means no pass', async () => {
    const check = await checkExercise(SOLUTION, '', options);
    expect(check.passed).toBe(false);
  });
});

describe('mini test API (Vitest-shaped)', () => {
  const runTests = (tests: string) => checkExercise('', tests, options);

  test('toEqual compares contents, toBe compares identity', async () => {
    const check = await runTests(`
      test("equal", () => expect({ a: [1, 2] }).toEqual({ a: [1, 2] }));
      test("same", () => expect({ a: 1 }).toBe({ a: 1 }));
    `);
    expect(check.results[0].status).toBe('pass');
    expect(check.results[1].status).toBe('fail');
    expect(check.results[1].message).toContain('use toEqual');
  });

  test('supports not, toContain, toHaveLength, toThrow, toBeTruthy', async () => {
    const check = await runTests(`
      test("not", () => expect(1).not.toBe(2));
      test("contain", () => { expect(["a", "b"]).toContain("b"); expect("Coffee").toContain("ff"); });
      test("length", () => expect([1, 2, 3]).toHaveLength(3));
      test("throw", () => { expect(() => { throw new Error("Quantity can't be negative") }).toThrow("negative"); });
      test("no throw", () => expect(() => 1).not.toThrow());
      test("truthy", () => { expect("x").toBeTruthy(); expect(0).toBeFalsy(); });
      test("async", async () => { const v = await Promise.resolve(3); expect(v).toBe(3); });
    `);
    expect(check.results.map((r) => r.status)).toEqual(Array(7).fill('pass'));
  });

  test('skipped tests are counted but do not fail', async () => {
    const check = await runTests(`
      test("runs", () => expect(1).toBe(1));
      test.skip("later", () => expect(1).toBe(2));
    `);
    expect(check.counts).toEqual({ passed: 1, failed: 0, skipped: 1 });
    expect(check.passed).toBe(true);
  });
});
