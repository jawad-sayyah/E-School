import { test as base, expect } from '@playwright/test';

/**
 * Pages are prerendered, so the HTML is on screen before React takes over (and replaces it).
 * Every navigation in these tests waits until the app is live (<html data-app-ready>), so a
 * click never lands on prerendered HTML that is about to be replaced.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      await page.locator('html[data-app-ready]').waitFor({ state: 'attached', timeout: 30_000 });
      return response;
    };
    const reload = page.reload.bind(page);
    page.reload = async (options) => {
      const response = await reload(options);
      await page.locator('html[data-app-ready]').waitFor({ state: 'attached', timeout: 30_000 });
      return response;
    };
    await provide(page);
  },
});

export { expect };
