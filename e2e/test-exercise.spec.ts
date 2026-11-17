import { expect, test } from '@playwright/test';

test('a "write the tests" exercise reports caught bugs and passes with good tests', async ({
  page,
}) => {
  await page.goto('/courses/testing/why-test');
  const card = page.locator('[data-question="test-exercise"]');
  await card.scrollIntoViewIfNeeded();

  // The starter has one test: it passes on the real code but misses bugs.
  await card.getByRole('button', { name: 'Check Your first tests: isFreeShipping' }).click();
  await expect(card.getByText(/Your tests caught [0-2] of 3 bugs/)).toBeVisible();
  await expect(card.getByText(/^Missed:/).first()).toBeVisible();
  await expect(card.getByText(/^Hint:/).first()).toBeVisible();

  await card.getByRole('button', { name: 'Show example tests' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Show example tests' }).click();
  await card.getByRole('button', { name: 'Put them in the editor' }).click();
  await card.getByRole('button', { name: 'Check Your first tests: isFreeShipping' }).click();
  await expect(card.getByText('Your tests caught 3 of 3 bugs')).toBeVisible();
  await expect(card.getByText('Completed')).toBeVisible();
});
