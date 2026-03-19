// T100: E2E test for admin flow
import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
  test('non-admin redirected away from /admin', async ({ page }) => {
    // Without auth, should redirect to login
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  // NOTE: Admin tests require ADMIN role authentication
  // These tests serve as smoke tests for the admin UI

  test.skip('admin page shows hospital management table', async ({ page }) => {
    // Requires admin auth session
    await page.goto('/admin');
    await expect(page.getByText('จัดการโรงพยาบาล')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test.skip('edit dialog opens for hospital', async ({ page }) => {
    // Requires admin auth session
    await page.goto('/admin');
    await page.getByText('แก้ไข').first().click();
    await expect(page.getByText('Tunnel URL')).toBeVisible();
  });
});
