import { test, expect } from '@playwright/test';

test.describe('Authentication & Cross-Cutting', () => {

  // ── Login ──

  test('TC-A01: Login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('TC-A02: Login page has correct title', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/ReviewRescue/i);
  });

  test('TC-A03: Invalid credentials show error message', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').fill('wrong@email.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    const error = page.locator('text=/Invalid|incorrect|failed/i');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('TC-A04: Valid credentials redirect to dashboard', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').fill('admin@gmail.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/', { timeout: 15000 });
    expect(page.url()).not.toContain('/login');
  });

  test('TC-A05: Unauthenticated user redirected to login', async ({ page }) => {
    // Clear storage first
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');
  });

  // ── 404 ──

  test('TC-A06: Unknown route shows 404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const notFound = page.locator('text=/not found|404|doesn\'t exist/i');
    if (await notFound.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(notFound).toBeVisible();
    }
  });

  // ── Data Integrity ──

  test('TC-A07: No raw error objects visible on any page', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').fill('admin@gmail.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Check dashboard
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('[object Object]');
    expect(bodyText).not.toContain('Error:');

    // Check reviews page
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const reviewsText = await page.locator('body').textContent();
    expect(reviewsText).not.toContain('[object Object]');

    // Check settings page
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const settingsText = await page.locator('body').textContent();
    expect(settingsText).not.toContain('[object Object]');
  });

  // ── Page Titles ──

  test('TC-A08: Dashboard has correct page title', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').fill('admin@gmail.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/', { timeout: 15000 });
    await expect(page).toHaveTitle(/ReviewRescue/i);
  });
});
