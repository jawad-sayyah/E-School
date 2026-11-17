import { expect, test } from '@playwright/test';

/*
 * Opt-in: runs React exercise solutions inside real Sandpack (its test runner differs
 * from Vitest's). Pass lessons as course/lesson, comma-separated:
 *   LESSONS=hooks/use-context,react/forms npx playwright test e2e/solutions.spec.ts
 * For each lesson's first React exercise: the starter must fail, the solution must pass.
 */
test.setTimeout(200_000);
for (const lesson of (process.env.LESSONS ?? '').split(',').filter(Boolean)) {
  test(lesson, async ({ page }) => {
    await page.goto(`/courses/${lesson}`);
    const card = page
      .locator('[data-question="react-exercise"], [data-question="build-ui"]')
      .first();
    await card.locator('.sp-tests').scrollIntoViewIfNeeded();
    await expect(card.getByRole('status')).toContainText(/failed|couldn't run/, {
      timeout: 150_000,
    });
    await card.getByRole('button', { name: 'Show solution' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Show solution' }).click();
    await card.getByRole('button', { name: 'Put the solution in the editor' }).click();
    try {
      await expect(card.getByRole('status')).toContainText('tests pass', { timeout: 60_000 });
    } finally {
      const panel = await card.locator('.sp-tests').innerText();
      console.log(`${lesson}: ${(await card.getByRole('status').innerText()).slice(0, 60)}`);
      if (!panel.includes('PASS')) console.log(panel.slice(0, 1500));
    }
  });
}
