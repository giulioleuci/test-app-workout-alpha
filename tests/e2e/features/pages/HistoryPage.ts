import { Page, Locator, expect } from '@playwright/test';

export class HistoryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly sessionCards: Locator;
  readonly emptyState: Locator;
  readonly filterPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /history|storico/i });
    this.sessionCards = page.locator('[data-testid="history-session-card"], .session-card, [role="listitem"]');
    this.emptyState = page.getByText(/no sessions|nessuna sessione/i);
    this.filterPanel = page.locator('[data-testid="history-filters"], .history-filters');
  }

  async goto() {
    await this.page.goto('/history');
  }

  async expectLoaded() {
    await expect(this.page).toHaveTitle(/Workout Tracker/i);
    await this.page.waitForLoadState('networkidle');
  }
}
