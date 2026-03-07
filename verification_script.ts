import { test, expect } from '@playwright/test';

test('verify dashboard muscles list excludes secondary muscles', async ({ page }) => {
  // 1. Go to Onboarding (assuming clean state or redirect)
  await page.goto('http://localhost:3000/');

  // Check if we are on onboarding by looking for "Benvenuto" or input fields
  // If we are already on dashboard, we might need to reset DB, but let's assume clean env for this verification or handle it.
  // Since I can't easily reset DB from here without access to window.db, I'll assume it's fresh or I'll try to detect.

  // If I see the dashboard greeting, I can't easily reset.
  // But wait, the previous tests might have left the DB in a dirty state?
  // No, the previous tests ran in Node/Vitest with fake-indexeddb, they don't persist to the browser's IndexedDB.
  // So the browser should be clean.

  await expect(page.getByText('Benvenuto in Workout Tracker 2!')).toBeVisible({ timeout: 10000 });

  // 2. Fill profile
  await page.fill('input[placeholder="Nome"]', 'Test User');
  await page.click('button[role="combobox"]'); // Gender select
  await page.click('div[role="option"] >> text=Maschio');
  await page.click('button:has-text("Avanti")');

  // 3. Select Seed options
  // Step 2
  await expect(page.getByText('Dati iniziali')).toBeVisible();

  // Select "Piano full body 2x settimana"
  // The label is "Piano full body 2x settimana"
  await page.click('label:has-text("Piano full body 2x settimana")');

  // 4. Start
  await page.click('button:has-text("Inizia!")');

  // 5. Wait for Dashboard
  await expect(page.getByText('Prossima sessione suggerita')).toBeVisible({ timeout: 20000 });

  // 6. Verify "Next suggested session" is "Giorno A" (from Full Body 2x seed)
  await expect(page.getByText('Giorno A')).toBeVisible();

  // 7. Verify Muscles Involved chips
  // We expect: Petto, Quadricipiti, Glutei, Dorsali alti, Dorsali, Spalle, Bicipiti, Addominali
  // We expect NOT: Tricipiti, Femorali, Avambracci

  const musclesSection = page.locator('div:has-text("Muscoli coinvolti")');

  // Primary muscles that MUST be present
  await expect(musclesSection).toContainText('Petto');
  await expect(musclesSection).toContainText('Quadricipiti');
  await expect(musclesSection).toContainText('Glutei');
  // UpperBack -> Dorsali alti, Lats -> Dorsali. Both might be present.
  await expect(musclesSection).toContainText('Dorsali');
  await expect(musclesSection).toContainText('Spalle');
  await expect(musclesSection).toContainText('Bicipiti');
  await expect(musclesSection).toContainText('Addominali');

  // Secondary muscles that MUST NOT be present
  await expect(musclesSection).not.toContainText('Tricipiti');
  await expect(musclesSection).not.toContainText('Femorali');
  await expect(musclesSection).not.toContainText('Avambracci');

  // Take screenshot
  await page.screenshot({ path: 'verification_screenshot.png', fullPage: true });
});
