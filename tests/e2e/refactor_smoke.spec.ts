import { test, expect } from '@playwright/test';

import { BackupPage } from './pages/BackupPage';

/**
 * Smoke coverage for pages whose data/logic was extracted into hooks/services
 * during the architecture refactor (useBackup, useAnalyticsFilters,
 * useOneRepMaxPageViewModel). These assert the decomposed pages still mount
 * and render their primary controls — catching broken hook/service wiring.
 */
test.describe('Refactor smoke', () => {
  test('Backup page renders its export/import controls', async ({ page }) => {
    const backup = new BackupPage(page);
    await backup.goto();
    await backup.expectLoaded();
  });

  test('Analytics page mounts without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/analytics');
    // Either the filters/empty-state or the charts render; in all cases the
    // app shell (nav/title) is present and no uncaught error was thrown.
    await expect(page).toHaveTitle(/Workout Tracker/i);
    await page.waitForLoadState('networkidle');
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('1RM page mounts without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/1rm');
    await expect(page).toHaveTitle(/Workout Tracker/i);
    await page.waitForLoadState('networkidle');
    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});
