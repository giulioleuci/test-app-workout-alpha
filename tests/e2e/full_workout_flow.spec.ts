
import { test, expect } from '@playwright/test';

test.describe('Full Workout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear data (Assuming a way to do this, e.g., via specialized route or button in dev)
    // For now, we assume a fresh start or ignore existing data if possible.
    // Ideally, we'd have a `await page.evaluate(() => window.indexedDB.deleteDatabase('FitTrackDB'))` before load.

    // Visit home
    await page.goto('/');
  });

  test('Create a workout, start a session, complete sets, and finish', async ({ page }) => {
    // 1. Create Workout
    await page.getByRole('link', { name: /Workouts|Allenamenti/i }).click();
    await page.getByRole('button', { name: /New|Nuovo/i }).click();

    await page.getByLabel(/Name|Nome/i).fill('Full Body Test');
    await page.getByRole('button', { name: /Create|Crea/i }).click();

    // Add Exercise Group 1 (Standard)
    await page.getByRole('button', { name: /Add Group|Aggiungi Gruppo/i }).click();
    await page.getByRole('button', { name: /Add Exercise|Aggiungi Esercizio/i }).first().click();

    // Select Exercise (Mocked data might vary, assuming at least one exists)
    // We'll search for "Squat" or pick the first available
    await page.waitForSelector('[role="dialog"]');
    const firstExercise = page.locator('[role="dialog"] button').filter({ hasText: /add/i }).first();
    if (await firstExercise.isVisible()) {
        await firstExercise.click();
    } else {
        // Fallback if no specific add button structure
        await page.locator('[role="dialog"] .cursor-pointer').first().click();
    }
    // Close dialog if not auto-closed (it usually is)

    // Save Workout
    await page.getByRole('button', { name: /Save|Salva/i }).click();

    // 2. Start Session
    await page.getByRole('button', { name: /Start|Avvia/i }).click();

    // 3. Complete Sets
    // Wait for active session page
    await expect(page.locator('h1')).toContainText(/Session|Sessione/i);

    // Complete Set 1
    await page.getByRole('button', { name: /Complete|Completa/i }).first().click();

    // 4. Finish Session
    await page.getByRole('button', { name: /Finish|Termina/i }).click();

    // Confirm finish (Dialog)
    await page.getByRole('button', { name: /Finish|Termina/i }).last().click(); // Confirm in dialog

    // 5. Verify History
    await page.getByRole('link', { name: /History|Storico/i }).click();
    await expect(page.getByText('Full Body Test').first()).toBeVisible();
  });
});
