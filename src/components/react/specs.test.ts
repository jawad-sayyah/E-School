// @vitest-environment node
import { describe, expect, test } from 'vitest';
import {
  checkFile,
  fileName,
  filesFrom,
  retarget,
  summarizeByFile,
  summarizeSpecs,
  type SpecResult,
} from './specs';

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

describe('write-the-tests helpers', () => {
  test('retarget points imports of the code under test at a buggy copy', () => {
    const tests =
      'import Cart from "./Cart";\nimport { total } from \'./cartUtils.js\';\nimport x from "./Other";';
    expect(retarget(tests, ['/Cart.js', '/cartUtils.js'], 0)).toBe(
      'import Cart from "./__bugs__/bug-1/Cart";\nimport { total } from \'./__bugs__/bug-1/cartUtils\';\nimport x from "./Other";',
    );
  });

  test("checkFile keeps the test file's extension, so TypeScript tests still parse", () => {
    expect(checkFile(0)).toBe('/check-1.test.js');
    expect(checkFile(1, '/useCart.test.tsx')).toBe('/check-2.test.tsx');
    expect(checkFile(2, '/storage.test.ts')).toBe('/check-3.test.ts');
  });

  test('retarget handles files in folders', () => {
    expect(retarget('import P from "./pages/ProductPage";', ['/pages/ProductPage.tsx'], 1)).toBe(
      'import P from "./__bugs__/bug-2/pages/ProductPage";',
    );
  });

  test('summarizeByFile keeps files apart', () => {
    const pass = { name: 'a', blocks: [], status: 'pass' as const, errors: [] };
    const fail = { name: 'b', blocks: [], status: 'fail' as const, errors: [] };
    const byFile = summarizeByFile({
      '/Cart.test.js': { name: '/Cart.test.js', tests: { a: pass }, describes: {} },
      '/check-1.test.js': { name: '/check-1.test.js', tests: { b: fail }, describes: {} },
    });
    expect(byFile['/Cart.test.js'].allPassed).toBe(true);
    expect(byFile['/check-1.test.js'].failed).toBe(1);
  });
});
