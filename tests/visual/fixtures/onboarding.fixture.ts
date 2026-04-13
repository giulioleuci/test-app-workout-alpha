import { test as base, type Page } from '@playwright/test';
import { waitForAppReady } from '../utils/navigation';
import { selectOption } from '../utils/interactions';

export const test = base.extend<{ onboardedPage: Page }>({
  onboardedPage: async ({ page }, use) => {
    // Navigate to root
    await page.goto('/');
    await waitForAppReady(page);

    // Check if we are on the onboarding page
    const onboardingTitle = page.getByText('Benvenuto in Workout Tracker 2!');

    if (await onboardingTitle.isVisible()) {
      console.log('Onboarding required. Completing...');

      // Step 1: Fill Profile
      await page.getByLabel('Nome *').fill('Test User');

      // Select Gender
      await selectOption(page, 'Genere', 'Maschio');

      // Click Next
      await page.getByRole('button', { name: 'Avanti' }).click();

      // Step 2: Seed Options
      // Wait for step 2 to appear
      await page.getByText('Scegli cosa caricare per iniziare subito.').waitFor();

      // Click Start
      await page.getByRole('button', { name: 'Inizia!' }).click();

      // Wait for redirection to Dashboard
      await waitForAppReady(page);

      console.log('Onboarding complete.');
    } else {
      console.log('Onboarding already complete.');
    }

    // Pass the page to the test
    await use(page);
  },
});

export { expect } from '@playwright/test';
