import { test, expect } from '../fixtures/onboarding.fixture';
import { waitForAppReady } from '../utils/navigation';

test.describe('Smoke: Navigation', () => {
  test('user can navigate to all main sections', async ({ onboardedPage: page }) => {
    // We are already on Dashboard (handled by fixture)
    await expect(page).toHaveURL('/');

    // Navigate to Workouts
    await page.getByRole('link', { name: 'Allenamenti' }).first().click();
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/workouts/);
    await expect(page.locator('header').getByText('Allenamenti', { exact: true })).toBeVisible();

    // Navigate to Exercises
    await page.getByRole('link', { name: 'Esercizi' }).first().click();
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/exercises/);
    await expect(page.locator('header').getByText('Esercizi', { exact: true })).toBeVisible();

    // Navigate to History
    await page.getByRole('link', { name: 'Storico' }).first().click();
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/history/);
    await expect(page.locator('header').getByText('Storico', { exact: true })).toBeVisible();

    // Navigate to Analytics
    await page.getByRole('link', { name: 'Statistiche' }).first().click();
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.locator('header').getByText('Statistiche', { exact: true })).toBeVisible();

    // Navigate back to Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('header').getByText('Dashboard', { exact: true })).toBeVisible();
  });
});
