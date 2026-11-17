import { expect, test } from '@playwright/test';

/* Monaco loads from a CDN, so these tests need the network. Set OFFLINE=1 to skip them. */
test.skip(Boolean(process.env.OFFLINE), 'Monaco needs the network');
test.setTimeout(120_000);

test('a TS playground shows live type errors and runs the compiled code', async ({ page }) => {
  await page.goto('/courses/ts-basics/why-typescript');
  const frame = page.locator('section', { has: page.locator('#ts-version') });
  await frame.scrollIntoViewIfNeeded();
  await expect(frame.getByText('1 type error')).toBeVisible({ timeout: 60_000 });
  await expect(frame.getByRole('list', { name: 'Type errors' })).toContainText(
    "Argument of type 'string' is not assignable to parameter of type 'number'",
  );
  await frame.getByRole('button', { name: 'Run cart.ts' }).click();
  await expect(frame.getByText('Ran anyway')).toBeVisible();
  await expect(frame.getByRole('log').last()).toContainText('Total items: 51');
});

test('a TS exercise: the starter fails, the solution passes', async ({ page }) => {
  await page.goto('/courses/ts-basics/why-typescript');
  const card = page.locator('[data-question="ts-exercise"]');
  await card.scrollIntoViewIfNeeded();
  await card.getByRole('button', { name: 'Check Fix the order total' }).click();
  await expect(card.getByText(/type error\(s\)|type check\(s\) failed/)).toBeVisible({
    timeout: 60_000,
  });

  await card.getByRole('button', { name: 'Show solution' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Show solution' }).click();
  await card.getByRole('button', { name: 'Put the solution in the editor' }).click();
  await card.getByRole('button', { name: 'Check Fix the order total' }).click();
  await expect(card.getByText('All checks pass')).toBeVisible({ timeout: 30_000 });
  await expect(card.getByText('Every hidden type check holds')).toBeVisible();
  await expect(card.getByText('Completed')).toBeVisible();
});
