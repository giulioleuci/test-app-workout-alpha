import { test, expect } from '@playwright/test';
import { takeScreenshot } from './utils/screenshot';
import { setupOnboarding } from './fixtures/onboarding.fixture';

test.describe('Dashboard Visuals', () => {
  test('empty dashboard', async ({ page }) => {
    // Ensure fresh state (cleared storage handled by fixture or manual clear)
    await page.evaluate(() => {
        indexedDB.deleteDatabase('WT_GlobalMeta');
        // Loop others if possible or rely on incognito context
    });

    // Go to root, should redirect to onboarding or show empty dashboard if no user?
    // Actually our app forces onboarding if no user.
    await page.goto('/');

    // Fill onboarding
    await setupOnboarding(page);

    // Now on dashboard
    await expect(page.getByText('Active Session')).toBeVisible();

    await takeScreenshot(page, {
        name: 'dashboard-empty',
        mask: ['.date-display'] // Mask dynamic dates if any
    });
  });
});
