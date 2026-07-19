import { Page, Locator, expect } from '@playwright/test';

/**
 * Page object for the Backup/Restore page (/backup).
 * Exercises the useBackup hook refactor (render-only page).
 */
export class BackupPage {
  readonly page: Page;
  readonly downloadButton: Locator;
  readonly selectFileButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Locale-tolerant: the export action button (download backup) and the import file picker.
    this.downloadButton = page.getByRole('button', { name: /download backup|scarica backup|esporta/i });
    this.selectFileButton = page.getByRole('button', { name: /select file|seleziona file/i });
  }

  async goto() {
    await this.page.goto('/backup');
  }

  async expectLoaded() {
    // The export action should be present once the page (and its hook) mounts.
    await expect(this.downloadButton.or(this.selectFileButton).first()).toBeVisible();
  }
}
