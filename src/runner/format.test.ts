// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { formatLine } from './format';
import { LIMITS } from './limits';

const fmt = (...args: unknown[]) => formatLine(args, LIMITS);

describe('formatLine', () => {
  test('prints top-level strings raw and nested strings quoted', () => {
    expect(fmt('Coffee', 2)).toBe('Coffee 2');
    expect(fmt(['Coffee', 'Bagel'])).toBe("[ 'Coffee', 'Bagel' ]");
    expect(fmt(["it's"])).toBe('[ "it\'s" ]');
  });

  test('prints arrays and objects like Node', () => {
    expect(fmt([8, 6, 10])).toBe('[ 8, 6, 10 ]');
    expect(fmt({ name: 'Coffee', qty: 2 })).toBe("{ name: 'Coffee', qty: 2 }");
    expect(fmt([{ id: 2, name: 'Bagel' }])).toBe("[ { id: 2, name: 'Bagel' } ]");
    expect(fmt([])).toBe('[]');
    expect(fmt({})).toBe('{}');
    expect(fmt([undefined, null, true])).toBe('[ undefined, null, true ]');
    expect(fmt({ 'my-key': 1 })).toBe("{ 'my-key': 1 }");
  });

  test('matches the reference outputs for entries', () => {
    expect(fmt(Object.entries({ coffee: 5, bagel: 2 }))).toBe("[ [ 'coffee', 5 ], [ 'bagel', 2 ] ]");
    expect(fmt([1, 2].map(() => undefined))).toBe('[ undefined, undefined ]');
  });

  test('prints special values', () => {
    expect(fmt(-0, NaN, Infinity, 10n)).toBe('-0 NaN Infinity 10n');
    expect(fmt(function add() {})).toBe('[Function: add]');
    expect(fmt(() => 1)).toBe('[Function (anonymous)]');
    expect(fmt(class Cart {})).toBe('[class Cart]');
    expect(fmt(new TypeError('boom'))).toBe('TypeError: boom');
    expect(fmt([new Error('x')])).toBe('[ [Error: x] ]');
    expect(fmt(new Map([['a', 1]]))).toBe("Map(1) { 'a' => 1 }");
    expect(fmt(new Set([1, 2]))).toBe('Set(2) { 1, 2 }');
    expect(fmt(/ab+c/g)).toBe('/ab+c/g');
    expect(fmt(Promise.resolve(1))).toBe('Promise { <pending> }');
  });

  test('prints class instances with their name', () => {
    class Item {
      name = 'Coffee';
    }
    expect(fmt(new Item())).toBe("Item { name: 'Coffee' }");
  });

  test('handles deep nesting and circular references', () => {
    expect(fmt({ a: { b: { c: { d: 1 } } } })).toBe('{ a: { b: { c: [Object] } } }');
    const cart: Record<string, unknown> = { name: 'cart' };
    cart.self = cart;
    expect(fmt(cart)).toBe("{ name: 'cart', self: [Circular] }");
  });

  test('caps arrays and objects at MAX_ITEMS', () => {
    const big = Array.from({ length: 5000 }, (_, i) => i);
    const text = fmt(big);
    expect(text.startsWith('[ 0, 1, 2')).toBe(true);
    expect(text).toContain('99, … 4900 more items ]');
    const obj = Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`k${i}`, i]));
    expect(fmt(obj)).toContain('… 50 more items }');
  });

  test('caps a line at MAX_CHARS and says how much was cut', () => {
    const text = fmt('x'.repeat(100_000));
    expect(text).toBe('x'.repeat(2000) + ' … (98000 more characters)');
  });

  test('can quote top-level strings (used for test messages)', () => {
    expect(formatLine(['hi'], LIMITS, true)).toBe("'hi'");
  });
});
