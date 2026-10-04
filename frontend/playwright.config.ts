import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for SATHI.
 *
 * Targets:
 *  - Chromium (primary + offline simulation)
 *
 * Run:
 *   npm run test:e2e           # headless
 *   npm run test:e2e -- --ui   # headed Playwright UI
 *
 * The dev server is started automatically before each test run.
 */
export default defineConfig({
  testDir: './e2e',
  /* Maximum time one test can run */
  timeout: 30_000,
  /* Fail the build on CI if you accidentally left test.only in the source */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Parallel workers */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter */
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    /* Base URL — points at the Vite dev server */
    baseURL: 'http://localhost:5173',
    /* Collect trace on first retry */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start the Vite dev server automatically */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
