import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { COURSES } from '../src/content/courses';

/**
 * No page may scroll sideways on a small phone (320px wide): long code, tables, visualizers
 * and long API names in headings must all wrap or scroll inside their own box.
 */
test.use({ viewport: { width: 320, height: 700 } });

const PAGES = [
  '/',
  '/tracks',
  '/tracks/javascript',
  '/tracks/website',
  '/courses',
  '/project',
  '/reference',
  '/progress',
  '/certificates/react',
];

async function overflowOf(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test('main pages: no horizontal scroll at 320px', async ({ page }) => {
  for (const url of PAGES) expect(await overflowOf(page, url), url).toBe(0);
});

for (const course of COURSES) {
  test(`${course.id}: no horizontal scroll at 320px`, async ({ page }) => {
    test.setTimeout(120_000);
    const urls = [course.id, ...course.lessons.map((l) => `${course.id}/${l}`)];
    for (const url of urls) expect(await overflowOf(page, `/courses/${url}`), url).toBe(0);
  });
}
