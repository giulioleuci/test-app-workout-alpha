import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Navigate to a route and wait for the app to be fully interactive.
 * Use this instead of page.goto() in test files.
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForAppReady(page);
}

/**
 * Wait for the React app to finish hydrating and initial data loads.
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for document to be interactive
  await page.waitForLoadState('domcontentloaded');

  // Wait for global loading spinner to disappear (using text "Caricamento...")
  const globalSpinner = page.getByText('Caricamento...', { exact: true });
  if (await globalSpinner.isVisible({ timeout: 500 }).catch(() => false)) {
    await expect(globalSpinner).not.toBeVisible({ timeout: 10_000 });
  }

  // Wait for network idle to ensure data fetching is done
  await page.waitForLoadState('networkidle');

  // Wait for skeletons to disappear if any
  const skeletons = page.locator('[class*="skeleton"], [data-testid*="skeleton"]');
  if (await skeletons.first().isVisible({ timeout: 500 }).catch(() => false)) {
      await expect(skeletons.first()).not.toBeVisible({ timeout: 10_000 });
  }
}

/**
 * Assert the current URL matches the expected path.
 */
export async function assertOnPage(page: Page, path: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')));
}
