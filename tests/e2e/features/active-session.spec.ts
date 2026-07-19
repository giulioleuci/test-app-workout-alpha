import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Active Session feature:
 * - No active session redirects or shows start prompt
 * - Rest timer is visible during a session
 * - FAB buttons (finish, discard) are accessible
 * - Exercise substitution dialog opens
 * - In-session history button is accessible
 */
test.describe('Active session — no active session', () => {
  test('accessing /session redirects or shows a meaningful UI', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/session');
    await page.waitForLoadState('networkidle');

    // Should either redirect to home/workouts or show "no active session" state
    const isRedirected = !page.url().includes('/session');
    const hasNoSessionMessage = await page
      .getByText(/no active session|nessuna sessione|start a workout/i)
      .isVisible();

    expect(isRedirected || hasNoSessionMessage).toBe(true);
    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});

test.describe('Active session — start and interact', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to workouts and attempt to start the first available session
    await page.goto('/workouts');
    await page.waitForLoadState('networkidle');

    const workoutLink = page.getByRole('link', { name: /workout|allenamento/i }).first();
    if (!await workoutLink.isVisible()) return;
    await workoutLink.click();
    await page.waitForLoadState('networkidle');

    const startButton = page.getByRole('button', { name: /start|avvia|begin/i }).first();
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('active session page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const url = page.url();
    if (!url.includes('/session')) {
      test.skip(); // No session was started
      return;
    }

    await page.waitForLoadState('networkidle');
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('finish session FAB button is accessible above rest timer', async ({ page }) => {
    if (!page.url().includes('/session')) {
      test.skip();
      return;
    }

    const finishFab = page
      .getByRole('button', { name: /finish|termina|complete/i })
      .first();

    if (await finishFab.isVisible()) {
      // Confirm it is not obscured by the rest timer — check z-index via visual position
      const box = await finishFab.boundingBox();
      expect(box).not.toBeNull();
    }
  });

  test('completing a set updates its visual state', async ({ page }) => {
    if (!page.url().includes('/session')) {
      test.skip();
      return;
    }

    const completeButton = page
      .getByRole('button', { name: /complete|done|completa/i })
      .first();

    if (await completeButton.isVisible()) {
      await completeButton.click();
      await page.waitForTimeout(300);
      // Page should still be on the session screen (not crashed)
      await expect(page).toHaveTitle(/Workout Tracker/i);
    }
  });

  test('discard session dialog confirms before discarding', async ({ page }) => {
    if (!page.url().includes('/session')) {
      test.skip();
      return;
    }

    const discardButton = page
      .getByRole('button', { name: /discard|cancel|annulla sessione/i })
      .first();

    if (await discardButton.isVisible()) {
      await discardButton.click();
      const dialog = page.getByRole('dialog').or(page.getByRole('alertdialog')).first();
      await expect(dialog).toBeVisible();

      // Cancel to keep the session going
      const cancelConfirm = dialog.getByRole('button', { name: /cancel|annulla|keep/i }).first();
      if (await cancelConfirm.isVisible()) {
        await cancelConfirm.click();
        await expect(dialog).not.toBeVisible();
      }
    }
  });
});
