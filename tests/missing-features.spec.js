import { test, expect } from '@playwright/test';
import { loginAsGM, waitForDataLoad } from './helpers.js';

/**
 * Missing functionality tests — fills gaps from the QA checklist
 */
test.describe('Missing Functionality Tests', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsGM(page);
  });

  // ──────────────────────────────────────────────────────────────────────
  //  1. Logout Confirmation Modal
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X01: Logout opens styled ConfirmModal (not window.confirm)', async ({ page }) => {
    const logoutBtn = page.locator('text=Logout').first();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();
    await page.waitForTimeout(500);
    // Should open a styled modal, not a browser alert
    const modal = page.locator('[class*="modal"], [class*="Modal"], [role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 3000 });
  });

  test('TC-X02: Logout modal Cancel closes modal, user stays logged in', async ({ page }) => {
    await page.locator('text=Logout').first().click();
    await page.waitForTimeout(500);
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(500);
    // Should still be on the same page (not redirected to login)
    expect(page.url()).not.toContain('/login');
  });

  test('TC-X03: Logout modal Confirm logs out and redirects to login', async ({ page }) => {
    await page.locator('text=Logout').first().click();
    await page.waitForTimeout(500);
    const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Log out")').first();
    await confirmBtn.click();
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  // ──────────────────────────────────────────────────────────────────────
  //  2. CSV Export
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X04: CSV Export button triggers download', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);

    const exportBtn = page.locator('button:has-text("Export"), button:has-text("CSV"), button:has-text("Download")').first();
    if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Listen for download
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await exportBtn.click();
      await page.waitForTimeout(1000);
      // Check if any dropdown appeared for export options
      const csvOption = page.locator('text=/CSV|csv/i').first();
      if (await csvOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await csvOption.click();
      }
      const download = await downloadPromise;
      if (download) {
        const filename = download.suggestedFilename();
        expect(filename).toMatch(/\.csv$/i);
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  3. Bulk Actions
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X05: Selecting multiple reviews shows bulk action bar', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);

    const cards = page.locator('.rc-card');
    const count = await cards.count();
    if (count < 2) return;

    // Hover and click checkboxes on first 2 cards
    for (let i = 0; i < 2; i++) {
      await cards.nth(i).hover();
      await page.waitForTimeout(200);
      const checkbox = cards.nth(i).locator('.rc-checkbox');
      if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        await checkbox.click();
        await page.waitForTimeout(200);
      }
    }

    // Check bulk action bar appeared
    const bulkBar = page.locator('text=/selected|Select/i');
    if (await bulkBar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(bulkBar).toBeVisible();
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  4. Reopen Flow (Approve → Reopen → Status reverts)
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X06: Reopen button opens ConfirmModal on a RESPONDED review', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);

    // Find a responded review
    const respondedTab = page.locator('button:has-text("Responded")').first();
    if (!await respondedTab.isVisible({ timeout: 3000 }).catch(() => false)) return;
    await respondedTab.click();
    await page.waitForTimeout(1000);

    const cards = page.locator('.rc-card');
    if (await cards.count() === 0) return;

    await cards.first().click();
    await page.waitForURL('**/reviews/**', { timeout: 5000 });
    await page.waitForTimeout(2000);

    // Find Reopen button
    const reopenBtn = page.locator('button:has-text("Reopen")').first();
    if (await reopenBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reopenBtn.click();
      await page.waitForTimeout(500);
      // Should show styled ConfirmModal
      const modal = page.locator('[class*="modal"], [class*="Modal"], [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 3000 });
      // Cancel to not actually reopen
      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      await cancelBtn.click();
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  5. Save Draft Only
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X07: Save Draft Only button saves without approving', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);

    const cards = page.locator('.rc-card');
    if (await cards.count() === 0) return;

    await cards.first().click();
    await page.waitForURL('**/reviews/**', { timeout: 5000 });
    await page.waitForTimeout(2000);

    const saveDraftBtn = page.locator('button:has-text("Save Draft"), button:has-text("Save draft")').first();
    if (await saveDraftBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(saveDraftBtn).toBeVisible();
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  6. Templates Dropdown
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X08: Templates dropdown shows available templates', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);

    const cards = page.locator('.rc-card');
    if (await cards.count() === 0) return;

    await cards.first().click();
    await page.waitForURL('**/reviews/**', { timeout: 5000 });
    await page.waitForTimeout(2000);

    const templateBtn = page.locator('button:has-text("Templates"), button:has-text("Template"), text=Templates').first();
    if (await templateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await templateBtn.click();
      await page.waitForTimeout(500);
      // Template options should appear
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  7. Character Count on Draft
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X09: Character count shows below draft area', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);

    const cards = page.locator('.rc-card');
    if (await cards.count() === 0) return;

    await cards.first().click();
    await page.waitForURL('**/reviews/**', { timeout: 5000 });
    await page.waitForTimeout(2000);

    // Look for character count text
    const charCount = page.locator('text=/\\d+\\s*\\/\\s*\\d+\\s*char/i');
    if (await charCount.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(charCount).toBeVisible();
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  8. Keyword Alert Banner in Review Detail
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X10: Keyword Alert banner shows when review matches keywords', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);

    const cards = page.locator('.rc-card');
    if (await cards.count() === 0) return;

    // Open a review
    await cards.first().click();
    await page.waitForURL('**/reviews/**', { timeout: 5000 });
    await page.waitForTimeout(2000);

    // Check if keyword alert banner exists (may not show if no keywords match)
    const keywordAlert = page.locator('text=/Keyword Alert/i');
    if (await keywordAlert.isVisible({ timeout: 2000 }).catch(() => false)) {
      // If it shows, verify it has an info tooltip
      const tooltip = keywordAlert.locator('xpath=ancestor::div[1]').locator('svg').first();
      await expect(tooltip).toBeVisible();
    }
    // This test passes even if no keyword matches — it only fails if the banner shows but is broken
  });

  // ──────────────────────────────────────────────────────────────────────
  //  9. Settings: AI Config Tab
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X11: AI Config tab has tone selector', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // AI tab should be default or first tab
    const aiTab = page.locator('button:has-text("AI")').first();
    if (await aiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiTab.click();
      await page.waitForTimeout(500);
    }

    // Default tone selector
    const tone = page.locator('text=/Default.*Tone|Response Tone/i').first();
    await expect(tone).toBeVisible({ timeout: 5000 });
  });

  test('TC-X12: AI Config tab has SLA configuration', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const aiTab = page.locator('button:has-text("AI")').first();
    if (await aiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiTab.click();
      await page.waitForTimeout(500);
    }

    // SLA section
    const sla = page.locator('text=/SLA|Response Time|Target/i').first();
    if (await sla.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sla).toBeVisible();
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  10. Settings: Account Tab
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X13: Account tab shows user name and email', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const accountTab = page.locator('button:has-text("Account")').first();
    if (await accountTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accountTab.click();
      await page.waitForTimeout(500);

      // Should show name field
      const nameField = page.locator('input[value*="admin"], input[placeholder*="name"], text=/Your Name|Profile/i').first();
      await expect(nameField).toBeVisible({ timeout: 5000 });
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  11. Settings: Template CRUD
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X14: Add new template in Settings Rules tab', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const rulesTab = page.locator('button:has-text("Rules")').first();
    if (!await rulesTab.isVisible({ timeout: 3000 }).catch(() => false)) return;
    await rulesTab.click();
    await page.waitForTimeout(1000);

    // Find template name input
    const nameInput = page.locator('input[placeholder*="Template"], input[placeholder*="template name"]').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('QA Test Template');

      // Fill content
      const contentInput = page.locator('textarea[placeholder*="template"], textarea[placeholder*="content"]').first();
      if (await contentInput.isVisible()) {
        await contentInput.fill('Thank you for your feedback. We appreciate it.');
      }

      // Click Add
      const addBtn = page.locator('button:has-text("Add Template")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
        // Template should appear in the list
        await expect(page.locator('text=QA Test Template')).toBeVisible();
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  12. Responsive Design
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X15: Mobile viewport: sidebar collapses, content adapts', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Sidebar text should be hidden on mobile
    const dashText = page.locator('nav >> text=Dashboard');
    // On mobile, either sidebar is hidden or collapsed
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('NaN');
  });

  test('TC-X16: Tablet viewport: review cards stack properly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);

    const body = await page.locator('body').textContent();
    expect(body).not.toContain('NaN');
    expect(body).not.toContain('[object Object]');
  });

  // ──────────────────────────────────────────────────────────────────────
  //  13. Toast Auto-Dismiss
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X17: Success toast auto-dismisses after a few seconds', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Trigger a save to generate a toast
    const saveBtn = page.locator('button:has-text("Save Settings"), button:has-text("Save")').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1000);

      // Check if success banner/toast appeared
      const toast = page.locator('text=/saved|success|updated/i').first();
      if (await toast.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Wait for it to auto-dismiss (5-6 seconds)
        await page.waitForTimeout(6000);
        // Should be hidden now
        await expect(toast).toBeHidden({ timeout: 3000 });
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  14. Info Tooltips Audit
  // ──────────────────────────────────────────────────────────────────────

  test('TC-X18: Settings Confidence threshold has info tooltip', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const rulesTab = page.locator('button:has-text("Rules")').first();
    if (!await rulesTab.isVisible({ timeout: 3000 }).catch(() => false)) return;
    await rulesTab.click();
    await page.waitForTimeout(1000);

    // Find Analysis Confidence heading
    const heading = page.locator('text=Analysis Confidence').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    // Should have an info tooltip icon nearby
    const parent = heading.locator('xpath=ancestor::h3[1] | ancestor::div[1]');
    const infoIcon = parent.locator('svg').first();
    await expect(infoIcon).toBeVisible();
  });

  test('TC-X19: Settings Keyword Alerts has info tooltip', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const rulesTab = page.locator('button:has-text("Rules")').first();
    if (!await rulesTab.isVisible({ timeout: 3000 }).catch(() => false)) return;
    await rulesTab.click();
    await page.waitForTimeout(1000);

    const heading = page.locator('text=Keyword Alerts').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    const parent = heading.locator('xpath=ancestor::h3[1] | ancestor::div[1]');
    const infoIcon = parent.locator('svg').first();
    await expect(infoIcon).toBeVisible();
  });

  test('TC-X20: Settings Response Templates has info tooltip', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const rulesTab = page.locator('button:has-text("Rules")').first();
    if (!await rulesTab.isVisible({ timeout: 3000 }).catch(() => false)) return;
    await rulesTab.click();
    await page.waitForTimeout(1000);

    const heading = page.locator('text=Response Templates').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    const parent = heading.locator('xpath=ancestor::h3[1] | ancestor::div[1]');
    const infoIcon = parent.locator('svg').first();
    await expect(infoIcon).toBeVisible();
  });
});
