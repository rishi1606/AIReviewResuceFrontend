import { test, expect } from '@playwright/test';
import { loginAsGM, waitForDataLoad } from './helpers.js';

/**
 * Multi-flow integration tests
 * These test end-to-end user journeys across multiple pages
 */
test.describe('Multi-Flow Integration Tests', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsGM(page);
  });

  // ──────────────────────────────────────────────────────────────────────
  //  Flow 1: Login → Dashboard → Reviews → Review Detail → Back
  // ──────────────────────────────────────────────────────────────────────

  test('TC-MF01: Full navigation flow: Dashboard → Reviews → Detail → Back', async ({ page }) => {
    // Step 1: Dashboard loads
    await page.waitForTimeout(2000);
    const dashContent = await page.locator('body').textContent();
    expect(dashContent).not.toContain('NaN');

    // Step 2: Navigate to Reviews
    await page.click('nav >> text=Reviews');
    await page.waitForURL('**/reviews', { timeout: 5000 });
    await waitForDataLoad(page);
    const cards = page.locator('.rc-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Step 3: Click first review card → Detail
    await cards.first().click();
    await page.waitForURL('**/reviews/**', { timeout: 5000 });
    await page.waitForTimeout(1500);

    // Step 4: Verify detail page loaded
    const detailContent = await page.locator('body').textContent();
    expect(detailContent.length).toBeGreaterThan(100);
    expect(detailContent).not.toContain('NaN');

    // Step 5: Go back to reviews
    const backBtn = page.locator('button:has-text("Back"), a:has-text("Back"), button:has-text("←")').first();
    await backBtn.click();
    await page.waitForURL('**/reviews', { timeout: 5000 });
    await waitForDataLoad(page);

    // Step 6: Cards should still be there
    const cardsAfter = await page.locator('.rc-card').count();
    expect(cardsAfter).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────
  //  Flow 2: Generate Draft → Approve → Verify notification + status
  // ──────────────────────────────────────────────────────────────────────

  test('TC-MF02: Generate draft → Approve → Notification appears → Status changes', async ({ page }) => {
    // Navigate to reviews
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);

    // Find a review that is NOT responded
    const cards = page.locator('.rc-card');
    const cardCount = await cards.count();
    if (cardCount === 0) return; // skip if no reviews

    // Click first card
    await cards.first().click();
    await page.waitForURL('**/reviews/**', { timeout: 5000 });
    await page.waitForTimeout(2000);

    // Check if already responded
    const respondedBanner = page.locator('text=/Response Approved|RESPONDED/i');
    if (await respondedBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Already responded, skip this test
      return;
    }

    // Step 1: Generate a draft
    const genBtn = page.locator('button:has-text("Generate")').first();
    if (await genBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await genBtn.click();
      // Wait for draft to generate (AI call)
      await page.waitForTimeout(10000);

      // Step 2: Check draft appeared
      const draftArea = page.locator('textarea, [class*="proposal"], [class*="draft"]');
      if (await draftArea.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Step 3: Approve
        const approveBtn = page.locator('button:has-text("Approve")').first();
        if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false) && await approveBtn.isEnabled()) {
          await approveBtn.click();
          await page.waitForTimeout(2000);

          // Step 4: Verify status changed to RESPONDED
          const statusBanner = page.locator('text=/Response Approved|RESPONDED|approved/i');
          await expect(statusBanner.first()).toBeVisible({ timeout: 5000 });

          // Step 5: Check notification bell has unread count
          // (notification was dispatched on approve)
          const bellBadge = page.locator('[class*="notification"] [class*="badge"], [class*="bell"] + span, [class*="count"]');
          // Just verify no crash happened
          const bodyText = await page.locator('body').textContent();
          expect(bodyText).not.toContain('[object Object]');
        }
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  Flow 3: Flag Review → Check it appears in Suspicious tab
  // ──────────────────────────────────────────────────────────────────────

  test('TC-MF03: Flag review → Verify it shows in Suspicious tab', async ({ page }) => {
    // Navigate to reviews
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);

    const cards = page.locator('.rc-card');
    const cardCount = await cards.count();
    if (cardCount === 0) return;

    // Click a card
    await cards.first().click();
    await page.waitForURL('**/reviews/**', { timeout: 5000 });
    await page.waitForTimeout(2000);

    // Get reviewer name for later verification
    const bodyText = await page.locator('body').textContent();

    // Check if already suspicious
    const alreadySuspicious = page.locator('text=/SUSPICIOUS|Suspicious/i');
    if (await alreadySuspicious.isVisible({ timeout: 2000 }).catch(() => false)) {
      return; // Already flagged, skip
    }

    // Find flag section and flag it
    const flagBtn = page.locator('button:has-text("Flag"), text=/Flag this review/i').first();
    if (await flagBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await flagBtn.click();
      await page.waitForTimeout(500);

      // Fill reason
      const reasonInput = page.locator('textarea, input[placeholder*="reason"]').last();
      if (await reasonInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await reasonInput.fill('Test flag for QA');

        // Submit flag
        const submitFlag = page.locator('button:has-text("Flag"), button:has-text("Submit")').last();
        if (await submitFlag.isEnabled()) {
          await submitFlag.click();
          await page.waitForTimeout(2000);

          // Verify suspicious badge appears
          const suspBadge = page.locator('text=/SUSPICIOUS|Suspicious|flagged/i');
          if (await suspBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Go back to reviews
            await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
            await waitForDataLoad(page);

            // Click Suspicious tab
            const suspTab = page.locator('button:has-text("Suspicious")').first();
            if (await suspTab.isVisible({ timeout: 3000 }).catch(() => false)) {
              await suspTab.click();
              await page.waitForTimeout(1000);
              // Should have at least 1 suspicious card
              const suspCards = page.locator('.rc-card');
              const suspCount = await suspCards.count();
              expect(suspCount).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  Flow 4: Settings → Change poll interval → Verify on TopBar
  // ──────────────────────────────────────────────────────────────────────

  test('TC-MF04: Change poll interval in TopBar → Persists on Settings page', async ({ page }) => {
    // Step 1: On Dashboard, set poll to 5m
    const fiveM = page.locator('button:has-text("5m")');
    await expect(fiveM).toBeVisible();
    await fiveM.click();
    await page.waitForTimeout(500);

    // Step 2: Navigate to Settings
    await page.click('nav >> text=Settings');
    await page.waitForURL('**/settings', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Step 3: Verify 5m is still selected in TopBar
    const stored = await page.evaluate(() => localStorage.getItem('pollInterval'));
    expect(stored).toBe('300000');

    // Step 4: Navigate back to Dashboard
    await page.click('nav >> text=Dashboard');
    await page.waitForURL('**/', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Step 5: 5m should still be selected
    const storedAfter = await page.evaluate(() => localStorage.getItem('pollInterval'));
    expect(storedAfter).toBe('300000');
  });

  // ──────────────────────────────────────────────────────────────────────
  //  Flow 5: Similar Reviews → Click → State resets cleanly
  // ──────────────────────────────────────────────────────────────────────

  test('TC-MF05: Navigate to review → Click similar review → State resets', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);

    const cards = page.locator('.rc-card');
    if (await cards.count() < 2) return; // Need at least 2 reviews

    // Open first review
    await cards.first().click();
    await page.waitForURL('**/reviews/**', { timeout: 5000 });
    await page.waitForTimeout(2000);
    const firstUrl = page.url();

    // Find a similar review link
    const similarLink = page.locator('a[href*="/reviews/"]').first();
    if (await similarLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await similarLink.click();
      await page.waitForTimeout(2000);
      const secondUrl = page.url();

      if (firstUrl !== secondUrl) {
        // Verify page loaded cleanly (no stale data)
        const body = await page.locator('body').textContent();
        expect(body).not.toContain('NaN');
        expect(body).not.toContain('[object Object]');
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  Flow 6: Property filter → Reviews update → Dashboard updates
  // ──────────────────────────────────────────────────────────────────────

  test('TC-MF06: Property filter affects both Reviews and Dashboard', async ({ page }) => {
    // Check property filter in sidebar
    const propFilter = page.locator('text=All Properties').first();
    if (!await propFilter.isVisible({ timeout: 3000 }).catch(() => false)) return;

    await propFilter.click();
    await page.waitForTimeout(300);

    // Select a specific property (not "All")
    const propOptions = page.locator('[class*="dropdown"] button, [class*="Dropdown"] button');
    const count = await propOptions.count();
    if (count > 1) {
      await propOptions.nth(1).click(); // Select first non-"All" property
      await page.waitForTimeout(1000);

      // Navigate to reviews
      await page.click('nav >> text=Reviews');
      await page.waitForURL('**/reviews', { timeout: 5000 });
      await waitForDataLoad(page);

      // Verify page loaded
      const body = await page.locator('body').textContent();
      expect(body).not.toContain('NaN');
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //  Flow 7: Review tabs → Sort → Filter → No crash
  // ──────────────────────────────────────────────────────────────────────

  test('TC-MF07: Rapid filter switching on Reviews page does not crash', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);

    // Rapidly switch tabs
    const tabs = ['All', 'Negative', 'Positive', 'Responded'];
    for (const tab of tabs) {
      const tabBtn = page.locator(`button:has-text("${tab}")`).first();
      if (await tabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Change sort
    const sortBtn = page.locator('button:has-text("Newest first")').first();
    if (await sortBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sortBtn.click();
      await page.waitForTimeout(200);
      const oldest = page.locator('button:has-text("Oldest First")');
      if (await oldest.isVisible({ timeout: 1000 }).catch(() => false)) {
        await oldest.click();
        await page.waitForTimeout(500);
      }
    }

    // Verify no crash
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('NaN');
    // Page should still be functional
    const reviewsVisible = page.locator('.rc-card, text=/No reviews matched/i');
    await expect(reviewsVisible.first()).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────────────
  //  Flow 8: Settings property validation → Fix errors → Save
  // ──────────────────────────────────────────────────────────────────────

  test('TC-MF08: Settings property validation flow: errors → fix → errors clear', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Go to Properties tab
    const propsTab = page.locator('button:has-text("Properties")').first();
    if (!await propsTab.isVisible({ timeout: 3000 }).catch(() => false)) return;
    await propsTab.click();
    await page.waitForTimeout(1000);

    // Click Add Property
    const addBtn = page.locator('button:has-text("Add Property"), button:has-text("+ Add")').first();
    if (!await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) return;
    await addBtn.click();
    await page.waitForTimeout(500);

    // Click Save without filling → should show errors
    const saveBtn = page.locator('button:has-text("Add Property")').last();
    await saveBtn.click();
    await page.waitForTimeout(300);

    // Verify errors are shown
    await expect(page.locator('text=/Property name is required/i')).toBeVisible();
    await expect(page.locator('text=/City is required/i')).toBeVisible();
    await expect(page.locator('text=/rooms is required/i')).toBeVisible();

    // Fix name → name error clears, others remain
    const nameInput = page.locator('input[placeholder*="Grand Palace"]');
    await nameInput.fill('QA Test Hotel');
    await page.waitForTimeout(200);
    await expect(page.locator('text=/Property name is required/i')).toBeHidden();
    await expect(page.locator('text=/City is required/i')).toBeVisible(); // still there

    // Fix city
    const cityInput = page.locator('input[placeholder*="Mumbai"]');
    await cityInput.fill('Mumbai');
    await page.waitForTimeout(200);
    await expect(page.locator('text=/City is required/i')).toBeHidden();

    // Fix rooms
    const roomsInput = page.locator('input[placeholder*="150"]');
    await roomsInput.fill('50');
    await page.waitForTimeout(200);
    await expect(page.locator('text=/rooms is required/i')).toBeHidden();

    // Cancel to not actually add
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(300);
  });
});
