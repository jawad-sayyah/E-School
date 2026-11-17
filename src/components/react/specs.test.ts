// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { fileName, filesFrom, summarizeSpecs, type SpecResult } from './specs';

const t = (name: string, status: 'pass' | 'fail', blocks: string[] = [], message?: string) => ({
  name,
  blocks,
  status,
  errors: message ? [{ message }] : [],
});

describe('summarizeSpecs', () => {
  test('counts nested passes and failures', () => {
    const specs: Record<string, SpecResult> = {
      '/App.test.js': {
        name: '/App.test.js',
        tests: { a: t('renders', 'pass') },
        describes: {
          Cart: {
            name: 'Cart',
            tests: {
              b: t('adds', 'pass', ['Cart']),
              c: t('removes', 'fail', ['Cart'], 'expected 1'),
            },
            describes: {},
          },
        },
      },
    };
    const s = summarizeSpecs(specs);
    expect(s).toMatchObject({ passed: 2, failed: 1, broken: null, allPassed: false });
    expect(s.tests.map((x) => x.name)).toEqual(['renders', 'Cart › adds', 'Cart › removes']);
    expect(s.tests[2].message).toBe('expected 1');
  });

  test('all passing', () => {
    const s = summarizeSpecs({
      x: { name: 'x', tests: { a: t('ok', 'pass') }, describes: {} },
    });
    expect(s.allPassed).toBe(true);
  });

  test('a broken file is never a pass', () => {
    const s = summarizeSpecs({
      x: { name: 'x', tests: {}, describes: {}, error: { message: 'SyntaxError' } },
    });
    expect(s).toMatchObject({ broken: 'SyntaxError', allPassed: false });
  });

  test('no tests is not a pass', () => {
    expect(summarizeSpecs({}).allPassed).toBe(false);
  });
});

describe('files from fences', () => {
  test('reads file= from the meta, with sensible defaults', () => {
    expect(fileName({ lang: 'jsx', meta: 'file=/Cart.js', code: '' })).toBe('/Cart.js');
    expect(fileName({ lang: 'jsx', meta: 'starter file=Cart.js', code: '' })).toBe('/Cart.js');
    expect(fileName({ lang: 'jsx', meta: '', code: '' })).toBe('/App.js');
    expect(fileName({ lang: 'css', meta: '', code: '' })).toBe('/styles.css');
  });

  test('filters by a meta word', () => {
    const blocks = [
      { lang: 'jsx', meta: 'starter', code: 'start' },
      { lang: 'jsx', meta: 'solution', code: 'done' },
      { lang: 'jsx', meta: 'tests file=/App.test.js', code: 'tests' },
    ];
    expect(filesFrom(blocks, 'starter')).toEqual({ '/App.js': 'start' });
    expect(filesFrom(blocks, 'tests')).toEqual({ '/App.test.js': 'tests' });
  });
});
