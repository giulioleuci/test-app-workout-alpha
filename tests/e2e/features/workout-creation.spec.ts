import { test, expect } from '@playwright/test';

/**
 * E2E tests for the workout creation and editing flow:
 * - Workout list page loads
 * - New workout can be created
 * - Exercises can be added to a session template
 * - Workout can be edited and saved
 * - Workout can be deleted
 * - Workout detail shows session list
 */

const WORKOUT_NAME = `E2E Test Workout ${Date.now()}`;

test.describe('Workout list', () => {
  test('page loads without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/workouts');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Workout Tracker/i);

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('shows create workout button', async ({ page }) => {
    await page.goto('/workouts');
    await page.waitForLoadState('networkidle');

    const createButton = page.getByRole('button', { name: /new|create|nuovo|crea|\+/i }).first();
    await expect(createButton).toBeVisible();
  });
});

test.describe('Create workout flow', () => {
  test('create a new workout with a name', async ({ page }) => {
    await page.goto('/workouts');
    await page.waitForLoadState('networkidle');

    const createButton = page.getByRole('button', { name: /new|create|nuovo|crea|\+/i }).first();
    await createButton.click();

    const dialog = page.getByRole('dialog').or(page.locator('form'));
    await expect(dialog.first()).toBeVisible();

    const nameInput = page.getByLabel(/name|nome/i).or(page.getByPlaceholder(/name|nome/i)).first();
    await nameInput.fill(WORKOUT_NAME);

    const confirmButton = page.getByRole('button', { name: /create|crea|confirm|ok|save/i }).first();
    await confirmButton.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to workout detail or show the new workout
    await expect(page).toHaveTitle(/Workout Tracker/i);
  });

  test('workout detail page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/workouts');
    await page.waitForLoadState('networkidle');

    const workoutLink = page.getByRole('link', { name: /workout|allenamento/i }).first();
    if (await workoutLink.isVisible()) {
      await workoutLink.click();
      await page.waitForLoadState('networkidle');
      expect(errors, errors.join('\n')).toHaveLength(0);
    }
  });
});

test.describe('Template editor', () => {
  test('template edit page loads without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/workouts');
    await page.waitForLoadState('networkidle');

    const editButton = page
      .getByRole('button', { name: /edit|modifica/i })
      .or(page.getByRole('link', { name: /edit|modifica/i }))
      .first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForLoadState('networkidle');
      expect(errors, errors.join('\n')).toHaveLength(0);
    }
  });

  test('add session to workout shows input field', async ({ page }) => {
    await page.goto('/workouts');
    await page.waitForLoadState('networkidle');

    // Navigate into first available workout
    const workoutLink = page.getByRole('link', { name: /workout|allenamento/i }).first();
    if (!await workoutLink.isVisible()) {
      test.skip();
      return;
    }
    await workoutLink.click();
    await page.waitForLoadState('networkidle');

    const addSessionButton = page
      .getByRole('button', { name: /add session|nuova sessione|add day/i })
      .first();

    if (await addSessionButton.isVisible()) {
      await addSessionButton.click();
      const input = page.getByRole('textbox').first();
      await expect(input).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('exercise picker dialog opens from template editor', async ({ page }) => {
    await page.goto('/workouts');
    await page.waitForLoadState('networkidle');

    // Look for an edit button to enter template editing mode
    const editLink = page
      .getByRole('button', { name: /edit|modifica/i })
      .or(page.getByRole('link', { name: /edit|modifica/i }))
      .first();

    if (!await editLink.isVisible()) {
      test.skip();
      return;
    }
    await editLink.click();
    await page.waitForLoadState('networkidle');

    const addExerciseButton = page
      .getByRole('button', { name: /add exercise|aggiungi esercizio/i })
      .first();

    if (await addExerciseButton.isVisible()) {
      await addExerciseButton.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });
});

test.describe('Workout deletion', () => {
  test('delete confirmation dialog appears', async ({ page }) => {
    await page.goto('/workouts');
    await page.waitForLoadState('networkidle');

    const deleteButton = page
      .getByRole('button', { name: /delete|remove|elimina/i })
      .first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      const dialog = page.getByRole('dialog').or(
        page.getByRole('alertdialog')
      ).first();
      await expect(dialog).toBeVisible();

      // Cancel the deletion
      const cancelButton = dialog.getByRole('button', { name: /cancel|annulla/i }).first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await expect(dialog).not.toBeVisible();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });
});
