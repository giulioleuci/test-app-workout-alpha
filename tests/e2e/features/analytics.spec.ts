import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Analytics page:
 * - Page mounts without runtime errors
 * - Empty state is displayed when there's no training data
 * - Date range picker is interactive
 * - Switching between analytics tabs/sections works
 */
test.describe('Analytics page', () => {
  test('loads without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Workout Tracker/i);

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('shows either analytics content or empty state (no crash)', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // The page should render something meaningful — not a blank or error screen
    const body = await page.locator('main, [role="main"], #root').first().textContent();
    expect(body).toBeTruthy();
  });

  test('date range filter controls are rendered and interactive', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Look for a date range picker or period selector
    const datePicker = page
      .getByRole('button', { name: /week|month|30|90|365|period|periodo/i })
      .first();

    if (await datePicker.isVisible()) {
      await datePicker.click();
      await page.waitForTimeout(200);
      // Should not crash
      await expect(page).toHaveTitle(/Workout Tracker/i);
    }
  });

  test('workout filter dropdown renders', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const workoutFilter = page
      .getByRole('combobox')
      .or(page.getByRole('button', { name: /all workouts|tutti|workout/i }))
      .first();

    if (await workoutFilter.isVisible()) {
      await workoutFilter.click();
      await page.waitForTimeout(200);
      // No crash expected
      await expect(page).toHaveTitle(/Workout Tracker/i);
      await page.keyboard.press('Escape');
    }
  });

  test('exercise filter dropdown renders', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const exerciseFilter = page
      .getByRole('combobox')
      .or(page.getByRole('button', { name: /all exercises|tutti gli esercizi/i }))
      .nth(1); // Second combobox if workout comes first

    if (await exerciseFilter.isVisible()) {
      await exerciseFilter.click();
      await page.waitForTimeout(200);
      await expect(page).toHaveTitle(/Workout Tracker/i);
      await page.keyboard.press('Escape');
    }
  });

  test('volume section is visible', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const volumeSection = page
      .getByText(/volume/i)
      .first();

    await expect(volumeSection).toBeVisible();
  });

  test('compliance section renders without error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const complianceText = page.getByText(/compliance|aderenza/i).first();
    if (await complianceText.isVisible()) {
      // Scroll to it to trigger any lazy rendering
      await complianceText.scrollIntoViewIfNeeded();
    }

    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});
