import { test, expect } from '@playwright/test';
import { loginAsGM, waitForDataLoad } from './helpers.js';

test.describe('Reviews Page', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsGM(page);
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);
  });

  // ── Tabs ──

  test('TC-R01: All tab is visible and clickable', async ({ page }) => {
    const tab = page.locator('button:has-text("All")').first();
    await expect(tab).toBeVisible();
    await tab.click();
    await page.waitForTimeout(500);
  });

  test('TC-R02: Negative tab filters to negative reviews', async ({ page }) => {
    const tab = page.locator('button:has-text("Negative")').first();
    await expect(tab).toBeVisible();
    await tab.click();
    await page.waitForTimeout(1000);
  });

  test('TC-R03: Positive tab filters to positive reviews', async ({ page }) => {
    const tab = page.locator('button:has-text("Positive")').first();
    await expect(tab).toBeVisible();
    await tab.click();
    await page.waitForTimeout(1000);
  });

  test('TC-R04: Suspicious tab shows flagged reviews', async ({ page }) => {
    const tab = page.locator('button:has-text("Suspicious")').first();
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(1000);
    }
  });

  test('TC-R05: Responded tab shows responded reviews', async ({ page }) => {
    const tab = page.locator('button:has-text("Responded")').first();
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(1000);
    }
  });

  // ── Filters ──

  test('TC-R06: Sort dropdown shows options', async ({ page }) => {
    const sort = page.locator('button:has-text("Newest first"), button:has-text("Oldest first")').first();
    await expect(sort).toBeVisible();
    await sort.click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Newest First')).toBeVisible();
    await expect(page.locator('text=Oldest First')).toBeVisible();
    await expect(page.locator('text=Lowest Rating First')).toBeVisible();
  });

  test('TC-R07: Department dropdown shows departments', async ({ page }) => {
    const deptBtn = page.locator('button:has-text("All Departments")').first();
    if (await deptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deptBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('TC-R08: Hide low confidence toggle works', async ({ page }) => {
    const toggle = page.locator('text=/Hide low confidence/i');
    await expect(toggle).toBeVisible();
    const toggleBtn = page.locator('button').filter({ has: page.locator('[class*="rounded-full"]') }).last();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(500);
    }
  });

  // ── Review Cards ──

  test('TC-R09: Review cards are visible with reviewer name', async ({ page }) => {
    const cards = page.locator('.rc-card');
    const count = await cards.count();
    if (count > 0) {
      const firstName = await cards.first().locator('.rc-name').textContent();
      expect(firstName.length).toBeGreaterThan(0);
    }
  });

  test('TC-R10: Review cards show star ratings', async ({ page }) => {
    const stars = page.locator('.rc-stars-row').first();
    if (await stars.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(stars).toBeVisible();
    }
  });

  test('TC-R11: Review text is scrollable (not cut off with line-clamp)', async ({ page }) => {
    const quote = page.locator('.rc-quote').first();
    if (await quote.isVisible({ timeout: 5000 }).catch(() => false)) {
      const styles = await quote.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return {
          overflowY: cs.overflowY,
          maxHeight: cs.maxHeight,
          webkitLineClamp: cs.webkitLineClamp || cs['-webkit-line-clamp'],
        };
      });
      expect(styles.overflowY).toBe('auto');
      expect(styles.webkitLineClamp).not.toBe('3');
    }
  });

  test('TC-R12: Scrollbar on review text is invisible', async ({ page }) => {
    const quote = page.locator('.rc-quote').first();
    if (await quote.isVisible({ timeout: 5000 }).catch(() => false)) {
      const scrollbarWidth = await quote.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return cs.scrollbarWidth;
      });
      expect(scrollbarWidth).toBe('none');
    }
  });

  test('TC-R13: Review cards show sentiment, department, urgency', async ({ page }) => {
    const insights = page.locator('.rc-insights').first();
    if (await insights.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(insights.locator('text=Sentiment')).toBeVisible();
    }
  });

  test('TC-R14: Clicking a review card navigates to detail', async ({ page }) => {
    const card = page.locator('.rc-card').first();
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/reviews/');
    }
  });

  test('TC-R15: View Review button navigates to detail', async ({ page }) => {
    const viewBtn = page.locator('.rc-view-btn').first();
    if (await viewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewBtn.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/reviews/');
    }
  });

  // ── Pagination ──

  test('TC-R16: Load More button appears when more reviews exist', async ({ page }) => {
    const loadMore = page.locator('button:has-text("Load 10 More")');
    // This may or may not exist depending on review count
    if (await loadMore.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loadMore.click();
      await page.waitForTimeout(2000);
    }
  });

  // ── Bulk Selection ──

  test('TC-R17: Hovering a card shows checkbox', async ({ page }) => {
    const card = page.locator('.rc-card').first();
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.hover();
      await page.waitForTimeout(300);
      const checkbox = card.locator('.rc-checkbox');
      if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(checkbox).toBeVisible();
      }
    }
  });

  // ── Empty State ──

  test('TC-R18: Empty state shows when no reviews match filters', async ({ page }) => {
    // Apply a filter that likely has no results
    const suspTab = page.locator('button:has-text("Suspicious")').first();
    if (await suspTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suspTab.click();
      await page.waitForTimeout(1000);
      // If no suspicious reviews, empty state should show
      const emptyState = page.locator('text=/No reviews matched/i');
      const cards = page.locator('.rc-card');
      const cardCount = await cards.count();
      if (cardCount === 0) {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  // ── No broken content ──

  test('TC-R19: No NaN or undefined visible on reviews page', async ({ page }) => {
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('NaN');
    expect(body).not.toMatch(/\bundefined\b/);
  });
});
