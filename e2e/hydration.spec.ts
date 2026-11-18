import { expect, test } from './fixtures';

/**
 * Prerendered pages are hydrated: the browser's first render must match the HTML. React
 * reports a mismatch as an error (#418/#423/#425 in production builds). Saved progress and a
 * light theme must not cause one either.
 */
const PAGES = [
  '/',
  '/courses/js-basics/variables',
  '/courses/why-react/before-after',
  '/courses/ts-basics/why-typescript',
  '/courses/minishop/move-to-react',
  '/tracks/website',
  '/progress',
  '/certificates/javascript',
];

for (const returning of [false, true]) {
  test(`pages hydrate without mismatches (${returning ? 'returning visitor' : 'new visitor'})`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && /hydrat|#418|#423|#425/i.test(m.text())) errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    if (returning) {
      await page.addInitScript(() => {
        localStorage.setItem('eschool-theme', 'light');
        localStorage.setItem('e-school:tasks:minishop/move-to-react', '[true,true]');
        localStorage.setItem('eschool-certificate-name', 'Ada');
      });
    }
    for (const url of PAGES) {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
