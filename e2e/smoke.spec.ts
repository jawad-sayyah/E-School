import { expect, test } from '@playwright/test';

const GET_TOTAL = `function getTotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}`;

test('open a lesson, run an example, pass an exercise and see progress', async ({ page }) => {
  await page.goto('/courses/js-basics/arrays-methods');
  await expect(page.getByRole('heading', { level: 1, name: 'Arrays II' })).toBeVisible();

  // Run an example in the worker.
  const reduce = page.locator('section', { has: page.locator('#reduce') });
  await reduce.getByRole('button', { name: 'Run reduce.js' }).click();
  await expect(reduce.getByText('Output · just now')).toBeVisible();
  await expect(reduce.getByRole('log')).toContainText('12');
  await expect(reduce.getByRole('log')).toContainText('11');

  // Pass the exercise.
  const editor = page.getByRole('textbox', { name: 'Exercise code: The cart total' });
  await editor.fill(GET_TOTAL);
  await page.getByRole('button', { name: 'Check The cart total' }).click();
  await expect(page.getByText('4 passed', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('All tests pass');

  // Complete the lesson.
  await page.getByRole('button', { name: 'Mark as complete' }).click();
  await expect(page.getByRole('button', { name: 'Completed' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'JavaScript Basics lessons' }).getByRole('link', {
      name: /Arrays II.*\(completed\)/,
    }),
  ).toBeVisible();

  // Progress shows up on the home page and the progress page.
  await page.goto('/');
  await expect(page.getByText('Continue where you left off')).toBeVisible();
  await expect(page.getByText('1 of 11 lessons')).toBeVisible();
  await page.goto('/progress');
  await expect(page.getByText('1 exercise passed so far.')).toBeVisible();
});

test('search for "reduce" jumps to the concept', async ({ page }) => {
  await page.goto('/');
  // Wait for the app to mount (pages load lazily) before using shortcuts.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('/');
  const input = page.getByPlaceholder('Search lessons, concepts and code…');
  await expect(input).toBeFocused();
  await input.fill('reduce');
  await expect(page.getByRole('option').first()).toContainText('reduce()');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/courses\/js-basics\/arrays-methods#reduce$/);
  await expect(page.locator('#reduce')).toBeInViewport();
  await expect(
    page.getByRole('navigation', { name: 'On this page' }).locator('[aria-current="location"]'),
  ).toHaveText('reduce()');
});

test('the palette opens with Ctrl+K and closes with Escape', async ({ page }) => {
  await page.goto('/courses');
  await expect(page.getByRole('heading', { level: 1, name: 'All courses' })).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('an infinite loop is stopped and the page stays responsive', async ({ page }) => {
  await page.goto('/courses/js-basics/loops');
  const section = page.locator('section', { has: page.locator('#while') });
  await section.getByRole('textbox').fill('while (true) {}');
  await section.getByRole('button', { name: 'Run while.js' }).click();
  // The page is still interactive while the worker spins.
  await page.getByRole('button', { name: /Switch to (light|dark) theme/ }).click();
  await expect(section.getByRole('log')).toContainText(
    'Stopped: the code ran for more than 4 seconds. Is there an infinite loop?',
    { timeout: 8000 },
  );
});

test('the theme choice is remembered', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/light/);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the lesson list opens as a drawer', async ({ page }) => {
    await page.goto('/courses/js-basics/functions');
    await expect(page.getByRole('heading', { level: 1, name: 'Functions' })).toBeVisible();
    await page.getByRole('button', { name: 'Open the lesson list' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByRole('link', { name: /Loops/ })).toBeVisible();
    await drawer.getByRole('link', { name: /Strings/ }).click();
    await expect(page).toHaveURL(/\/courses\/js-basics\/strings$/);
    await expect(page.getByRole('dialog')).toBeHidden();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });
});

test('the reference page filters entries and runs examples', async ({ page }) => {
  await page.goto('/reference');
  await expect(
    page.getByRole('heading', { level: 1, name: 'JavaScript Quick Reference' }),
  ).toBeVisible();
  await expect(page.getByText('78 entries')).toBeVisible();

  await page.getByLabel('Filter the reference').fill('fetch');
  await expect(page.getByText('2 of 78 entries')).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: /fetch\(\) \+ res\.ok/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: /^Callbacks/ })).toBeHidden();

  const entry = page.locator('article#fetch-ok');
  await entry.getByRole('button', { name: 'Run fetch-ok.js' }).click();
  await expect(entry.getByRole('log')).toContainText('1 item(s) loaded');

  await page.getByLabel('Filter the reference').fill('zzzz');
  await expect(page.getByText(/No results for/)).toBeVisible();
});

test('search finds reference entries and jumps to them', async ({ page }) => {
  await page.goto('/courses');
  await expect(page.getByRole('heading', { level: 1, name: 'All courses' })).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByPlaceholder('Search lessons, concepts and code…').fill('preventDefault');
  await expect(page.getByRole('group', { name: 'JS Quick Reference' })).toBeVisible();
  await page.getByRole('group', { name: 'JS Quick Reference' }).getByRole('option').first().click();
  await expect(page).toHaveURL(/\/reference#prevent-default$/);
  await expect(page.locator('#prevent-default')).toBeInViewport();
});

test('a new page load never restores another page’s scroll position', async ({ page }) => {
  await page.goto('/reference#gotchas');
  await page.goto('/reference#arrow-return');
  await expect(page.locator('#arrow-return')).toBeInViewport();
  await page.goto('/courses/js-basics/objects#nullish');
  await expect(page.getByRole('heading', { level: 2, name: '??' })).toBeInViewport();
  await expect(
    page.getByRole('navigation', { name: 'On this page' }).locator('[aria-current="location"]'),
  ).toHaveText('??');
});

test('questions give feedback, XP and a reveal after two wrong tries', async ({ page }) => {
  await page.goto('/courses/js-basics/variables');
  await expect(page.getByRole('heading', { level: 1, name: 'Variables & types' })).toBeVisible();

  // Predict the output: right on the first try earns 10 XP.
  const predict = page.locator('[data-question="predict"]');
  await predict.getByLabel('Your prediction').fill('Bagel × 3\nstring');
  await predict.getByRole('button', { name: 'Check' }).click();
  await expect(predict.getByText('Correct!')).toBeVisible();
  await expect(predict.getByText('+10 XP')).toBeVisible();

  // Order the lines (lesson 3): two wrong checks unlock "Show answer".
  await page.goto('/courses/js-basics/conditions');
  const order = page.locator('[data-question="order"]');
  await order.scrollIntoViewIfNeeded();
  await order.getByRole('button', { name: 'Check' }).click();
  await expect(order.getByText('Not yet.')).toBeVisible();
  await order.getByRole('button', { name: 'Try again' }).click();
  await order.getByRole('button', { name: 'Check' }).click();
  await order.getByRole('button', { name: 'Show answer' }).click();
  await expect(order.getByText('Here’s the answer.')).toBeVisible();
  await expect(order.locator('ol li').first()).toContainText('function shippingLabel(total) {');
});

test('completing a lesson earns a badge and shows on the progress page', async ({ page }) => {
  await page.goto('/courses/js-basics/loops');
  await page.getByRole('button', { name: 'Mark as complete' }).click();
  await expect(page.getByText('Badge earned: First steps')).toBeVisible();
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: 'Badges' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'First steps' })).toContainText(
    '(earned)',
  );
  await expect(page.getByRole('link', { name: /Level 1, 50 XP/ })).toBeVisible();
});

test('tracks and certificates', async ({ page }) => {
  await page.goto('/tracks');
  for (const name of ['JavaScript', 'TypeScript', 'React', 'Build a real website with React']) {
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: 'JavaScript', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'JavaScript' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'JavaScript Basics' })).toBeVisible();
  await page.getByRole('link', { name: 'Preview' }).click();
  await expect(page.getByText(/This is a preview/)).toBeVisible();
});
