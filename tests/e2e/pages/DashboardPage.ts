import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly startWorkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use a more generic selector if possible, or support multiple locales.
    // Given the app seems to be Italian-first, we'll keep the Italian text but make it case-insensitive
    // and potentially fall back to a safer selector if available in the future (e.g. testid).
    this.startWorkoutButton = page.getByRole('button', { name: /vai agli allenamenti|go to workouts/i });
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectLoaded() {
    await expect(this.page).toHaveTitle(/Workout Tracker/i);
  }
}
