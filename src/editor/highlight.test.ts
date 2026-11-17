// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { tokenize, tokenizeValue } from './highlight';

describe('tokenize', () => {
  test('keeps every character (layers must align)', () => {
    const code =
      'const total = cart.reduce((sum, i) => sum + i.price, 0); // sum\nconsole.log(`$${total}`);';
    expect(
      tokenize(code)
        .map((t) => t.text)
        .join(''),
    ).toBe(code);
  });

  test('colors keywords, strings, numbers, functions, properties and comments', () => {
    const kinds = tokenize('const a = "hi"; log(2); x.qty // c')
      .filter((t) => t.kind !== 'plain')
      .map((t) => `${t.kind}:${t.text}`);
    expect(kinds).toEqual(['kw:const', 'str:"hi"', 'fn:log', 'num:2', 'prop:qty', 'cm:// c']);
  });
});

describe('tokenizeValue', () => {
  test('colors console values', () => {
    expect(tokenizeValue('42')).toEqual([{ kind: 'num', text: '42' }]);
    expect(tokenizeValue("[ 'a', 2 ]").map((p) => p.kind)).toEqual([
      'plain',
      'str',
      'plain',
      'num',
      'plain',
    ]);
  });
});

test('colors JSX tag names, not comparisons', () => {
  const tags = tokenize('<li key={id}>{name}</li>\n<Cart />\nif (a < b) {}')
    .filter((t) => t.kind === 'tag')
    .map((t) => t.text);
  expect(tags).toEqual(['li', 'li', 'Cart']);
});
