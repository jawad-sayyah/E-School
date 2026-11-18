import { defineConfig, devices } from '@playwright/test';

/**
 * The e2e tests against an already running dev server (npm run dev), without a production
 * build first. Handy while writing lessons:
 *   TESTS=minishop/checkout npx playwright test -c playwright.dev.config.ts e2e/solutions.spec.ts
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 150_000,
  reporter: 'list',
  workers: 2,
  use: { baseURL: 'http://localhost:5173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
