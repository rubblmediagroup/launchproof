import { expect, test } from '@playwright/test';

test('showcase analysis renders genuine release artifacts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start deterministic analysis/i }).click();
  await expect(page.getByText('RELEASE DECISION')).toBeVisible();
  await expect(page.getByRole('button', { name: 'system' })).toBeVisible();
  await page.getByRole('button', { name: 'system' }).click();
  await expect(page.getByText(/architecture and trust relationships/i)).toBeVisible();
});

test('controlled regression comparison explains changed artifacts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /compare reference/i }).click();
  await expect(page.getByText('CONTROLLED REGRESSION')).toBeVisible();
  await expect(page.getByText(/changed controls/i)).toBeVisible();
});
