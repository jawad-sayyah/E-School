import { expect, test } from '@playwright/test';

/*
 * Opt-in: runs React exercise solutions inside real Sandpack (its test runner differs
 * from Vitest's). Pass lessons as course/lesson, comma-separated:
 *   LESSONS=hooks/use-context,react/forms npx playwright test e2e/solutions.spec.ts
 * For each lesson's first React exercise (or the Nth, with course/lesson@N): the starter must fail,
 * the solution must pass.
 */
test.setTimeout(320_000);
for (const entry of (process.env.LESSONS ?? '').split(',').filter(Boolean)) {
  const [lesson, nth = '1'] = entry.split('@');
  test(entry, async ({ page }) => {
    await page.goto(`/courses/${lesson}`);
    const card = page
      .locator('[data-question="react-exercise"], [data-question="build-ui"]')
      .nth(Number(nth) - 1);
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

/*
 * Opt-in, for "write the tests" exercises in Sandpack (course/lesson or course/lesson@N):
 *   TESTS=minishop/typescript npx playwright test e2e/solutions.spec.ts
 * The example tests must pass on the real code and catch every hidden bug.
 */
for (const entry of (process.env.TESTS ?? '').split(',').filter(Boolean)) {
  const [lesson, nth = '1'] = entry.split('@');
  test(`tests: ${entry}`, async ({ page }) => {
    await page.goto(`/courses/${lesson}`);
    const card = page.locator('[data-question="react-test-exercise"]').nth(Number(nth) - 1);
    await card.scrollIntoViewIfNeeded();
    const status = card.getByRole('status');
    await expect(status).toContainText(/Your tests caught|couldn't run|fail/, { timeout: 150_000 });
    await card.getByRole('button', { name: 'Show example tests' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Show example tests' }).click();
    await card.getByRole('button', { name: 'Put them in the editor' }).click();
    try {
      await expect(status).toContainText(/Your tests caught (\d+) of \1 bugs/, {
        timeout: 150_000,
      });
    } finally {
      console.log(`tests ${entry}: ${(await status.innerText()).slice(0, 80)}`);
    }
  });
}

/*
 * Opt-in: the Nth live preview on a lesson shows some text once it has loaded:
 *   PREVIEWS=minishop/typescript@1=MiniShop npx playwright test e2e/solutions.spec.ts
 */
for (const entry of (process.env.PREVIEWS ?? '').split(',').filter(Boolean)) {
  const [where, text = ''] = entry.split('=');
  const [lesson, nth = '1'] = where.split('@');
  test(`preview: ${entry}`, async ({ page }) => {
    await page.goto(`/courses/${lesson}`);
    const frame = page.locator('iframe[title="Sandpack Preview"]').nth(Number(nth) - 1);
    await frame.scrollIntoViewIfNeeded({ timeout: 60_000 });
    const body = page
      .frameLocator('iframe[title="Sandpack Preview"]')
      .nth(Number(nth) - 1)
      .locator('body');
    await expect(body).toContainText(text, { timeout: 120_000 });
  });
}
