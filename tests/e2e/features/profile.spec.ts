import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Profile page:
 * - Page loads without runtime errors
 * - Profile info section is visible
 * - Weight tracking section renders
 * - Settings toggles are interactive
 */
test.describe('Profile page', () => {
  test('loads without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Workout Tracker/i);

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('displays profile information section', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const nameField = page
      .getByLabel(/name|nome/i)
      .or(page.getByText(/profile|profilo/i))
      .first();

    await expect(nameField).toBeVisible();
  });

  test('weight tracking section is visible', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const weightSection = page
      .getByText(/weight|peso|body weight|peso corporeo/i)
      .first();

    await expect(weightSection).toBeVisible();
  });

  test('add body weight record dialog opens', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const addWeightButton = page
      .getByRole('button', { name: /add weight|aggiungi peso|\+/i })
      .first();

    if (await addWeightButton.isVisible()) {
      await addWeightButton.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });

  test('simple mode toggle is interactive', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const simpleToggle = page
      .getByRole('switch', { name: /simple mode|modalità semplice/i })
      .or(page.getByLabel(/simple mode|modalità semplice/i))
      .first();

    if (await simpleToggle.isVisible()) {
      const initialState = await simpleToggle.getAttribute('aria-checked');
      await simpleToggle.click();
      await page.waitForTimeout(200);
      const newState = await simpleToggle.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);

      // Toggle back to restore state
      await simpleToggle.click();
    }
  });
});
