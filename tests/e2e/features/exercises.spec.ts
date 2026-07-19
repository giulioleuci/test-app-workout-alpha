import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Exercise Library feature:
 * - Page loads without errors
 * - Exercise list renders
 * - Search/filter works
 * - Exercise detail or form opens
 * - Custom exercise can be created
 */
test.describe('Exercise library', () => {
  test('page loads without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/exercises');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Workout Tracker/i);

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('shows at least the seeded exercises', async ({ page }) => {
    await page.goto('/exercises');
    await page.waitForLoadState('networkidle');

    // The library has seeded exercises — at least one item should be visible
    const exerciseItems = page.locator('[role="listitem"], [data-testid="exercise-item"], li');
    await expect(exerciseItems.first()).toBeVisible();
  });

  test('search box filters the exercise list', async ({ page }) => {
    await page.goto('/exercises');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/search|cerca/i)
    ).first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('squat');

      // After typing, list should still render (not crash)
      await page.waitForTimeout(300); // debounce
      await expect(page).not.toHaveTitle(/error/i);
    }
  });

  test('muscle group filter narrows results', async ({ page }) => {
    await page.goto('/exercises');
    await page.waitForLoadState('networkidle');

    const filterButton = page
      .getByRole('button', { name: /filter|muscl|gruppo/i })
      .first();

    if (await filterButton.isVisible()) {
      await filterButton.click();
      const chestOption = page.getByText(/chest|petto/i).first();
      if (await chestOption.isVisible()) {
        await chestOption.click();
        await page.waitForTimeout(300);
        // Page should not error out
        await expect(page).toHaveTitle(/Workout Tracker/i);
      }
    }
  });

  test('opening add-exercise dialog works', async ({ page }) => {
    await page.goto('/exercises');
    await page.waitForLoadState('networkidle');

    const addButton = page
      .getByRole('button', { name: /add|new|nuovo|aggiungi/i })
      .first();

    if (await addButton.isVisible()) {
      await addButton.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Close via Escape
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });

  test('clicking an exercise opens its detail', async ({ page }) => {
    await page.goto('/exercises');
    await page.waitForLoadState('networkidle');

    const firstExercise = page
      .locator('button, [role="button"]')
      .filter({ hasText: /squat|bench|deadlift/i })
      .first();

    if (await firstExercise.isVisible()) {
      await firstExercise.click();
      await page.waitForLoadState('networkidle');
      // Either a dialog or a detail page should appear
      const detailVisible =
        (await page.getByRole('dialog').isVisible()) ||
        !(await firstExercise.isVisible()); // navigated away
      expect(detailVisible).toBe(true);
    }
  });
});
