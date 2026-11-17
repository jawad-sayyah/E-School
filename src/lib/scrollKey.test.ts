// @vitest-environment node
import { expect, test } from 'vitest';
import { scrollKey } from './scrollKey';

test('in-app navigations keep their own history key', () => {
  expect(scrollKey({ key: 'abc123', pathname: '/courses', hash: '' })).toBe('abc123');
});

test('first entries of different page loads never share a key', () => {
  const reference = scrollKey({ key: 'default', pathname: '/reference', hash: '#reduce' });
  const lesson = scrollKey({
    key: 'default',
    pathname: '/courses/js-basics/objects',
    hash: '#nullish',
  });
  expect(reference).not.toBe(lesson);
  expect(lesson).toBe('/courses/js-basics/objects#nullish');
});
