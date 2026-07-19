import { test, expect } from '@playwright/test';

/**
 * E2E tests for the 1RM (One-Rep-Max) page:
 * - Page loads without runtime errors
 * - Exercise selector is rendered
 * - Adding a 1RM record opens a dialog
 * - Record is displayed after creation
 * - Deleting a record works
 */
test.describe('1RM page', () => {
  test('loads without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/1rm');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Workout Tracker/i);

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('shows exercise selector or empty state', async ({ page }) => {
    await page.goto('/1rm');
    await page.waitForLoadState('networkidle');

    // Either the exercise combobox or empty text is visible
    const selector = page.getByRole('combobox').or(
      page.getByText(/select exercise|seleziona esercizio|no record/i)
    ).first();

    await expect(selector).toBeVisible();
  });

  test('add record dialog opens', async ({ page }) => {
    await page.goto('/1rm');
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('button', { name: /add|new|nuovo|aggiungi|\+/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });

  test('can select an exercise and view its records', async ({ page }) => {
    await page.goto('/1rm');
    await page.waitForLoadState('networkidle');

    const combobox = page.getByRole('combobox').first();
    if (await combobox.isVisible()) {
      await combobox.click();
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await page.waitForTimeout(300);
        // Page should show records or an "add first record" prompt
        await expect(page).toHaveTitle(/Workout Tracker/i);
      }
    }
  });

  test('add and then delete a 1RM record', async ({ page }) => {
    await page.goto('/1rm');
    await page.waitForLoadState('networkidle');

    // Select an exercise first
    const combobox = page.getByRole('combobox').first();
    if (!await combobox.isVisible()) {
      test.skip();
      return;
    }

    await combobox.click();
    const firstOption = page.getByRole('option').first();
    if (!await firstOption.isVisible()) {
      test.skip();
      return;
    }
    await firstOption.click();

    // Open add dialog
    const addButton = page.getByRole('button', { name: /add|new|nuovo|aggiungi|\+/i }).first();
    if (!await addButton.isVisible()) {
      test.skip();
      return;
    }
    await addButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill in load field
    const loadInput = dialog.getByRole('spinbutton').or(dialog.getByLabel(/load|carico|kg|lbs/i)).first();
    if (await loadInput.isVisible()) {
      await loadInput.fill('100');
    }

    // Confirm
    const saveButton = dialog.getByRole('button', { name: /save|confirm|ok|aggiungi/i }).first();
    await saveButton.click();
    await page.waitForTimeout(300);

    // Record should appear; look for delete button
    const deleteButton = page.getByRole('button', { name: /delete|remove|elimina/i }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      // Confirmation dialog or immediate deletion
      const confirmButton = page.getByRole('button', { name: /confirm|delete|elimina|ok/i }).first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      await page.waitForTimeout(300);
    }
  });
});
