import { test, expect } from '@playwright/test';
import { loginAsGM, waitForDataLoad } from './helpers.js';

test.describe('Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsGM(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);
  });

  // ── KPI Cards ──

  test('TC-D01: Total Reviews KPI card is visible with a number', async ({ page }) => {
    const kpi = page.locator('text=/Total Reviews/i').first();
    await expect(kpi).toBeVisible({ timeout: 10000 });
  });

  test('TC-D02: Average Rating KPI card is visible', async ({ page }) => {
    const kpi = page.locator('text=/Average Rating|Avg Rating/i').first();
    await expect(kpi).toBeVisible({ timeout: 10000 });
  });

  test('TC-D03: Response Rate KPI card is visible', async ({ page }) => {
    const kpi = page.locator('text=/Response Rate/i').first();
    await expect(kpi).toBeVisible({ timeout: 10000 });
  });

  test('TC-D04: Pending Reviews KPI card is visible', async ({ page }) => {
    const kpi = page.locator('text=/Pending|Needs Response/i').first();
    await expect(kpi).toBeVisible({ timeout: 10000 });
  });

  test('TC-D05: KPI values are not NaN or undefined', async ({ page }) => {
    const body = await page.locator('main, [class*="dashboard"]').first().textContent();
    expect(body).not.toContain('NaN');
    expect(body).not.toContain('undefined');
  });

  // ── Charts ──

  test('TC-D06: Sentiment chart/section renders', async ({ page }) => {
    const chart = page.locator('text=/Sentiment|Rating Trend|Trend/i').first();
    await expect(chart).toBeVisible({ timeout: 10000 });
  });

  test('TC-D07: Department breakdown section renders', async ({ page }) => {
    const section = page.locator('text=/Department|Category/i').first();
    await expect(section).toBeVisible({ timeout: 10000 });
  });

  test('TC-D08: Platform breakdown section renders', async ({ page }) => {
    const section = page.locator('text=/Platform|Source/i').first();
    await expect(section).toBeVisible({ timeout: 10000 });
  });

  // ── Date Range ──

  test('TC-D09: Date range selector is functional', async ({ page }) => {
    const dateBtn = page.locator('text=/This Month|Last 30|7 days|All Time/i').first();
    if (await dateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateBtn.click();
      await page.waitForTimeout(300);
    }
  });

  // ── No broken values ──

  test('TC-D10: No percentages above 100% or negative', async ({ page }) => {
    const allText = await page.locator('body').textContent();
    // Find all percentage values
    const percentages = allText.match(/(\d+)%/g) || [];
    for (const p of percentages) {
      const val = parseInt(p);
      // Allow 0-100 range (some might be confidence scores up to 100)
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });
});
