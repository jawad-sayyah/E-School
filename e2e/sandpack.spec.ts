import { expect, test } from '@playwright/test';

/*
 * Sandpack runs the React code in CodeSandbox's in-browser bundler, so these tests
 * need the network. Set OFFLINE=1 to skip them.
 */
test.skip(Boolean(process.env.OFFLINE), 'Sandpack needs the network');
test.setTimeout(150_000);

test('a vanilla playground runs the script in a live preview', async ({ page }) => {
  await page.goto('/courses/why-react/vanilla-cart');
  const preview = page.frameLocator('iframe[title="Sandpack Preview"]').first();
  await page.locator('iframe[title="Sandpack Preview"]').first().scrollIntoViewIfNeeded();
  await preview.getByRole('button', { name: 'Add' }).first().click({ timeout: 90_000 });
  await expect(preview.locator('#badge')).toHaveText('1');
  await expect(preview.locator('#total')).toHaveText('4');
});

test('a React exercise: the starter fails, the solution passes and saves progress', async ({
  page,
}) => {
  await page.goto('/courses/why-react/before-after');
  const card = page.locator('[data-question="react-exercise"]');
  const status = card.getByRole('status');
  await card.locator('.sp-tests').scrollIntoViewIfNeeded();

  // The tests run on load: the starter has no Remove button yet.
  await expect(status).toContainText('failed', { timeout: 120_000 });

  await card.getByRole('button', { name: 'Show solution' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Show solution' }).click();
  await card.getByRole('button', { name: 'Put the solution in the editor' }).click();
  await expect(status).toContainText('All 3 tests pass', { timeout: 120_000 });
  await expect(card.getByText('Completed')).toBeVisible();
});
