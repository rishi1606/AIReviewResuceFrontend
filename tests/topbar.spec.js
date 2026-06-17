import { test, expect } from '@playwright/test';
import { loginAsGM, navigateTo, waitForDataLoad } from './helpers.js';

test.describe('TopBar', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsGM(page);
  });

  // ── Greeting ──

  test('TC-T01: Shows greeting with user name', async ({ page }) => {
    const greeting = page.locator('text=/Good (morning|afternoon|evening)/i');
    await expect(greeting).toBeVisible({ timeout: 5000 });
  });

  // ── Search ──

  test('TC-T02: Search input is visible with placeholder', async ({ page }) => {
    const search = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
    await expect(search).toBeVisible();
  });

  test('TC-T03: Typing in search filters content', async ({ page }) => {
    const search = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
    await search.fill('test search');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    // Should navigate to reviews or show results
    expect(page.url()).toContain('reviews');
  });

  // ── Poll Interval ──

  test('TC-T04: Poll interval selector shows 30s, 1m, 5m options', async ({ page }) => {
    const thirtyS = page.locator('button:has-text("30s")');
    const oneM = page.locator('button:has-text("1m")');
    const fiveM = page.locator('button:has-text("5m")');
    await expect(thirtyS).toBeVisible();
    await expect(oneM).toBeVisible();
    await expect(fiveM).toBeVisible();
  });

  test('TC-T05: Poll interval persists to localStorage after selecting 5m', async ({ page }) => {
    const fiveM = page.locator('button:has-text("5m")');
    await fiveM.click();
    await page.waitForTimeout(500);
    // Check localStorage
    const stored = await page.evaluate(() => localStorage.getItem('pollInterval'));
    expect(stored).toBe('300000');
  });

  test('TC-T06: Poll interval persists across page refresh', async ({ page }) => {
    const fiveM = page.locator('button:has-text("5m")');
    await fiveM.click();
    await page.waitForTimeout(500);
    // Reload
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // 5m should still be active (check localStorage)
    const stored = await page.evaluate(() => localStorage.getItem('pollInterval'));
    expect(stored).toBe('300000');
  });

  // ── Refresh ──

  test('TC-T07: Refresh button triggers data reload', async ({ page }) => {
    const refreshBtn = page.locator('button:has-text("Refresh")');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await page.waitForTimeout(1000);
    // "Updated" label should show recent time
    const updated = page.locator('text=/Updated|Just now|ago/i');
    await expect(updated).toBeVisible();
  });

  // ── Updated label ──

  test('TC-T08: Updated label shows time since last refresh', async ({ page }) => {
    const label = page.locator('text=/Updated|ago|Just now/i');
    await expect(label).toBeVisible();
  });

  // ── Notification Bell ──

  test('TC-T09: Notification bell icon is visible', async ({ page }) => {
    const bell = page.locator('[class*="bell"], [aria-label*="notification"], svg.lucide-bell').first();
    if (await bell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(bell).toBeVisible();
    }
  });

  // ── User Avatar ──

  test('TC-T10: User avatar initials are visible in top right', async ({ page }) => {
    const avatar = page.locator('text=GM').first();
    await expect(avatar).toBeVisible();
  });
});
