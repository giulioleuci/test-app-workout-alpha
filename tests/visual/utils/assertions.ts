import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Assert the page has no visible error states.
 */
export async function assertNoErrors(page: Page): Promise<void> {
  await expect(page.getByText('Something went wrong')).not.toBeVisible();
  await expect(page.getByText('404')).not.toBeVisible();
  await expect(page.getByText('Internal Server Error')).not.toBeVisible();
}

/**
 * Assert a key heading or landmark is visible.
 */
export async function assertPageTitle(page: Page, title: string): Promise<void> {
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

/**
 * Assert a toast notification appeared with the expected message.
 */
export async function assertToast(page: Page, message: string): Promise<void> {
  // Shadcn toast uses role='status' or 'alert' usually
  const toast = page.getByRole('status').filter({ hasText: message })
    .or(page.getByRole('alert').filter({ hasText: message }));
  await expect(toast).toBeVisible({ timeout: 5000 });
}

/**
 * Collect all console errors during a test.
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}
