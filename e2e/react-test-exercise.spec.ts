import { expect, test } from '@playwright/test';

/* Sandpack needs the network. Set OFFLINE=1 to skip. */
test.skip(Boolean(process.env.OFFLINE), 'Sandpack needs the network');
test.setTimeout(200_000);

test('a React "write the tests" exercise grades tests against hidden buggy versions', async ({
  page,
}) => {
  await page.goto('/courses/testing/react-testing-library');
  const card = page.locator('[data-question="react-test-exercise"]');
  await card.scrollIntoViewIfNeeded();
  const status = card.getByRole('status');

  // The starter only checks the name, so it passes on the real component but misses bugs.
  await expect(status).toContainText(/Your tests caught [0-3] of 4 bugs/, { timeout: 150_000 });

  await card.getByRole('button', { name: 'Show example tests' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Show example tests' }).click();
  await card.getByRole('button', { name: 'Put them in the editor' }).click();
  await expect(status).toContainText('Your tests caught 4 of 4 bugs', { timeout: 90_000 });
  await expect(card.getByText('Completed')).toBeVisible();
});
