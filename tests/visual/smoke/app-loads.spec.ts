import { test, expect } from '@playwright/test';
import { waitForAppReady } from '../utils/navigation';
import { assertNoErrors } from '../utils/assertions';

test.describe('Smoke: App Loads', () => {
  test('root route renders without error', async ({ page }) => {
    // Navigate to root
    await page.goto('/');

    // Wait for app ready
    await waitForAppReady(page);

    // Assert no visible errors
    await assertNoErrors(page);

    // Check if we are on Dashboard OR Onboarding
    const onboardingTitle = page.getByRole('heading', { name: 'Benvenuto in Workout Tracker 2!' });
    const dashboardTitle = page.locator('header').getByText('Dashboard');

    // Wait for either to appear
    await expect(async () => {
        const onboardingVisible = await onboardingTitle.isVisible();
        const dashboardVisible = await dashboardTitle.isVisible();
        expect(onboardingVisible || dashboardVisible).toBe(true);
    }).toPass();
  });
});
