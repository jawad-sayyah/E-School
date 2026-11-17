import { expect, test } from '@playwright/test';

/** Lessons with wide content (visualizers, code, tables) must never scroll sideways on a phone. */
test.use({ viewport: { width: 390, height: 844 } });

const PAGES = [
  '/courses/js-basics/loops',
  '/courses/js-depth/event-loop',
  '/courses/why-react/ui-from-state',
  '/courses/how-react-works/rendering',
  '/courses/hooks/state-snapshot',
  '/courses/hooks/use-effect',
  '/courses/ts-basics/why-typescript',
  '/courses/ts-react/typing-props',
  '/reference',
];

for (const url of PAGES) {
  test(`no horizontal scroll at phone width: ${url}`, async ({ page }) => {
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
}
