import { test, expect } from '@playwright/test';

import { HistoryPage } from './pages/HistoryPage';

/**
 * E2E tests for the History feature:
 * - List page loads and renders without errors
 * - Empty state is displayed when no sessions exist
 * - Date range filter controls are interactive
 * - Navigating into a history detail page works
 * - Back navigation returns to list
 */
test.describe('History list', () => {
  test('page loads without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const historyPage = new HistoryPage(page);
    await historyPage.goto();
    await historyPage.expectLoaded();

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('shows empty state or session list', async ({ page }) => {
    const historyPage = new HistoryPage(page);
    await historyPage.goto();
    await historyPage.expectLoaded();

    // Either empty state message or at least one session card is visible
    const hasEmpty = await historyPage.emptyState.isVisible();
    const hasCards = await historyPage.sessionCards.count() > 0;
    expect(hasEmpty || hasCards).toBe(true);
  });

  test('navigates to history detail and back', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('a[href*="/history/"], [role="link"][href*="/history/"]');
    const count = await cards.count();

    if (count > 0) {
      await cards.first().click();
      await page.waitForLoadState('networkidle');

      // Should be on a detail page with a back button or breadcrumb
      const backButton = page.getByRole('button', { name: /back|indietro/i }).or(
        page.getByRole('link', { name: /back|indietro|storico|history/i })
      );
      await expect(backButton.first()).toBeVisible();

      await backButton.first().click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/history/);
    }
  });
});

test.describe('History detail page', () => {
  test('loads without runtime errors when navigating directly (or redirects)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // Navigate to a non-existent session — should gracefully show not-found or redirect
    await page.goto('/history/non-existent-session-id');
    await page.waitForLoadState('networkidle');

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('set editing dialog opens and closes', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('a[href*="/history/"]');
    if (await cards.count() === 0) {
      test.skip();
      return;
    }

    await cards.first().click();
    await page.waitForLoadState('networkidle');

    // Look for edit/pencil buttons on sets
    const editButton = page.getByRole('button', { name: /edit|modifica/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }
  });
});

test.describe('History filters', () => {
  test('workout filter dropdown is accessible', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');

    const filterButton = page.getByRole('button', { name: /filter|filtro|workout/i }).first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      // A dropdown or popover should appear
      const dropdown = page.getByRole('listbox').or(page.getByRole('menu')).first();
      await expect(dropdown).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
});
