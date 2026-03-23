import { Page, expect } from '@playwright/test';

export interface ScreenshotOptions {
  name: string;
  mask?: string[]; // Selectors to mask
}

export async function takeScreenshot(page: Page, options: ScreenshotOptions) {
  const { name, mask } = options;

  // Wait for network idle (simple heuristic)
  await page.waitForLoadState('networkidle');

  // Wait for fonts (optional but good practice)
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveScreenshot(`${name}.png`, {
    mask: mask ? mask.map(selector => page.locator(selector)) : [],
    fullPage: true,
    animations: 'disabled',
  });
}
