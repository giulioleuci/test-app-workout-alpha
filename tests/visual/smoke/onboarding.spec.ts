import { test, expect } from '@playwright/test';
import { waitForAppReady } from '../utils/navigation';
import { selectOption } from '../utils/interactions';

test.describe('Smoke: Onboarding Flow', () => {
  test('new user can complete onboarding', async ({ page }) => {
    // 1. Start at root
    await page.goto('/');
    await waitForAppReady(page);

    // 2. Verify we are on onboarding
    // Use a more generic check in case the heading level changes, but specific text
    await expect(page.getByText('Benvenuto in Workout Tracker 2!')).toBeVisible();

    // 3. Fill Profile
    await page.getByLabel('Nome *').fill('Test User');

    // Select Gender
    // We use the helper we created
    await selectOption(page, 'Genere', 'Maschio');

    // Click Next
    await page.getByRole('button', { name: 'Avanti' }).click();

    // 4. Verify Step 2 (Seed options)
    // "Dati iniziali" is not displayed, but the subtitle is:
    await expect(page.getByText('Scegli cosa caricare per iniziare subito.')).toBeVisible();
    await expect(page.getByText('30 esercizi comuni')).toBeVisible();

    // Click Start
    await page.getByRole('button', { name: 'Inizia!' }).click();

    // 5. Verify Redirect to Dashboard
    // Wait for URL to be root (which is where dashboard lives)
    await expect(page).toHaveURL('/');
    await waitForAppReady(page);

    // Verify Dashboard content
    // Check for the header title "Dashboard"
    await expect(page.locator('header').getByText('Dashboard')).toBeVisible();

    // Check for some dashboard content to be sure
    // "Nessun allenamento configurato" appears if no workouts are present
    // Or "Prossima sessione suggerita" if data was seeded
    const emptyState = page.getByText('Nessun allenamento configurato');
    const suggestState = page.getByText('Prossima sessione suggerita');

    await expect(emptyState.or(suggestState)).toBeVisible();
  });
});
