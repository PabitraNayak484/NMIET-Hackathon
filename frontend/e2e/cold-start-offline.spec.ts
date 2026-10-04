/**
 * SATHI E2E — Cold-start offline test (MR-44)
 *
 * Verifies that the app loads fully in < 3 seconds when the Service Worker
 * cache is warm and the network is then set to offline.
 *
 * Test flow:
 *   1. Load the app online — Service Worker registers and caches all assets.
 *   2. Set network to offline (simulates airplane mode).
 *   3. Reload the page.
 *   4. Assert: Home screen renders in < 3 000 ms.
 *
 * Run: npm run test:e2e -- --project=chromium
 */
import { test, expect } from '@playwright/test';

test.describe('Cold-start offline (MR-44)', () => {
  test('app loads in < 3 s after SW cache warm-up, with network offline', async ({ browser }) => {
    // -----------------------------------------------------------------------
    // Phase 1: warm up the Service Worker cache while online
    // -----------------------------------------------------------------------
    const contextOnline = await browser.newContext();
    const warmPage = await contextOnline.newPage();

    await warmPage.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

    // Confirm the app shell loaded (SATHI heading or profile picker present)
    await expect(warmPage.locator('h1')).toContainText('SATHI', { timeout: 10_000 });

    // Give the SW time to finish caching
    await warmPage.waitForTimeout(1_500);
    await contextOnline.close();

    // -----------------------------------------------------------------------
    // Phase 2: reload with network offline, measure load time
    // -----------------------------------------------------------------------
    const contextOffline = await browser.newContext({
      offline: true,          // All network requests will fail
      serviceWorkers: 'allow', // Keep existing SW registrations
    });
    const page = await contextOffline.newPage();

    const t0 = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10_000 });

    // Wait for the main heading to appear
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 5_000 });

    const elapsed = Date.now() - t0;
    console.log(`Cold-start offline load time: ${elapsed} ms`);

    // MR-44: must render in under 3 000 ms
    expect(elapsed).toBeLessThan(3_000);

    await contextOffline.close();
  });
});
