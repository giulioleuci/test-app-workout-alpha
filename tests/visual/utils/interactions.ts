import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Fill a form field by its label and wait for the value to be set.
 */
export async function fillField(page: Page, label: string, value: string): Promise<void> {
  const field = page.getByLabel(label);
  await field.click();
  await field.fill(value);
  await expect(field).toHaveValue(value);
}

/**
 * Select an option from a Radix UI Select component.
 */
export async function selectOption(page: Page, triggerLabel: string, optionLabel: string): Promise<void> {
  // Try to find the trigger by its accessible name (label)
  const trigger = page.getByRole('combobox', { name: triggerLabel });

  if (await trigger.count() > 0 && await trigger.isVisible()) {
    await trigger.click();
  } else {
    // Fallback: find by the text visible on the trigger (e.g. placeholder)
    await page.getByRole('combobox').filter({ hasText: triggerLabel }).first().click();
  }

  // Wait for options to appear and click the target one
  await page.getByRole('option', { name: optionLabel }).click();
}

/**
 * Submit a form by its submit button label.
 */
export async function submitForm(page: Page, buttonLabel = 'Submit'): Promise<void> {
  await page.getByRole('button', { name: buttonLabel }).click();
}

/**
 * Open a modal/dialog by clicking a trigger button and wait for it to appear.
 */
export async function openModal(page: Page, triggerLabel: string): Promise<void> {
  await page.getByRole('button', { name: triggerLabel }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

/**
 * Close the currently open modal/dialog.
 */
export async function closeModal(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
}
