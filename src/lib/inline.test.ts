// @vitest-environment node
import { expect, test } from 'vitest';
import { inlineParts } from '@/lib/inline';

test('splits text, `code` and **bold**', () => {
  expect(inlineParts('Use `map`, then **join** it')).toEqual([
    { kind: 'text', value: 'Use ' },
    { kind: 'code', value: 'map' },
    { kind: 'text', value: ', then ' },
    { kind: 'bold', value: 'join' },
    { kind: 'text', value: ' it' },
  ]);
});

test('double backticks hold code that contains backticks, like Markdown', () => {
  expect(inlineParts('Label: ``aria-label={`Add ${name}`}`` here')).toEqual([
    { kind: 'text', value: 'Label: ' },
    { kind: 'code', value: 'aria-label={`Add ${name}`}' },
    { kind: 'text', value: ' here' },
  ]);
  expect(inlineParts('`` `x` ``')).toEqual([{ kind: 'code', value: '`x`' }]);
});

test('** inside code stays code', () => {
  expect(inlineParts('`2 ** 3` is 8')).toEqual([
    { kind: 'code', value: '2 ** 3' },
    { kind: 'text', value: ' is 8' },
  ]);
});

test('a template literal in single backticks splits into pieces (the content test catches it)', () => {
  const parts = inlineParts('Give it `aria-label={`Add ${name}`}` now');
  expect(parts.some((p) => p.kind === 'text' && p.value.includes('${'))).toBe(true);
});
