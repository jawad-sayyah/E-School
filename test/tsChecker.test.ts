// @vitest-environment node
import { expect, test } from 'vitest';
import { transpile, typeCheck } from './tsChecker';

test('finds a type error on the right line', () => {
  const { diagnostics } = typeCheck('const price: number = 4;\nconst label: string = price;');
  expect(diagnostics.map((d) => [d.line, d.source, d.code])).toEqual([[2, 'code', 2322]]);
});

test('clean code has no diagnostics, and two lessons never clash', () => {
  expect(typeCheck('type Item = { id: number };\nconst a: Item = { id: 1 };').diagnostics).toEqual(
    [],
  );
  expect(
    typeCheck('type Item = { name: string };\nconst b: Item = { name: "x" };').diagnostics,
  ).toEqual([]);
});

test('hidden checks see the code, and an unused @ts-expect-error is an error in the checks', () => {
  const code = 'type Qty = any;';
  const checks = '// @ts-expect-error a string is not a quantity\nconst q: Qty = "2";';
  const { diagnostics } = typeCheck(code, checks);
  expect(diagnostics.map((d) => [d.source, d.line])).toEqual([['checks', 1]]);
  expect(typeCheck('type Qty = number;', checks).diagnostics).toEqual([]);
});

test('TSX with React types', () => {
  const ok =
    'function Badge({ count }: { count: number }) { return <span>{count}</span>; }\nconst el = <Badge count={2} />;';
  expect(typeCheck(ok, '', true).diagnostics).toEqual([]);
  const bad =
    'function Badge({ count }: { count: number }) { return <span>{count}</span>; }\nconst el = <Badge count="2" />;';
  expect(typeCheck(bad, '', true).diagnostics.map((d) => d.line)).toEqual([2]);
});

test('transpiles to plain JavaScript', () => {
  expect(transpile('const qty: number = 2;\nconsole.log(qty as number);')).toBe(
    'const qty = 2;\nconsole.log(qty);',
  );
});
