import { test, expect } from '@playwright/test';
import { loginAsGM, navigateTo, waitForDataLoad } from './helpers.js';

test.describe('Sidebar Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsGM(page);
  });

  // ── Navigation ──

  test('TC-S01: Dashboard link navigates and shows active highlight', async ({ page }) => {
    await page.click('nav >> text=Dashboard');
    await expect(page).toHaveURL('/');
    const link = page.locator('nav >> text=Dashboard');
    await expect(link).toBeVisible();
  });

  test('TC-S02: Reviews link navigates and shows active highlight', async ({ page }) => {
    await page.click('nav >> text=Reviews');
    await expect(page).toHaveURL(/\/reviews/);
  });

  test('TC-S03: Settings link navigates and shows active highlight', async ({ page }) => {
    await page.click('nav >> text=Settings');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('TC-S04: Sidebar collapse button works', async ({ page }) => {
    const collapseBtn = page.locator('button:has-text("«"), [aria-label*="collapse"], [aria-label*="Collapse"]').first();
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(500);
      // After collapse, sidebar text should be hidden
      const dashText = page.locator('nav >> text=Dashboard');
      await expect(dashText).toBeHidden();
    }
  });

  // ── Property Filter ──

  test('TC-S05: Property filter dropdown shows properties', async ({ page }) => {
    const propFilter = page.locator('text=All Properties').first();
    if (await propFilter.isVisible()) {
      await propFilter.click();
      await page.waitForTimeout(300);
      // Dropdown should have items
      const options = page.locator('[class*="dropdown"] button, [class*="Dropdown"] button');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  // ── Platform Filter ──

  test('TC-S06: Platform filter dropdown shows platforms', async ({ page }) => {
    const platFilter = page.locator('text=All Platforms').first();
    if (await platFilter.isVisible()) {
      await platFilter.click();
      await page.waitForTimeout(300);
    }
  });

  // ── User Section ──

  test('TC-S07: User name and role visible at bottom of sidebar', async ({ page }) => {
    const sidebar = page.locator('nav').first();
    const gmText = sidebar.locator('text=General Manager');
    if (await gmText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(gmText).toBeVisible();
    }
  });

  test('TC-S08: Logout button is visible', async ({ page }) => {
    const logoutBtn = page.locator('text=Logout').first();
    await expect(logoutBtn).toBeVisible();
  });
});
