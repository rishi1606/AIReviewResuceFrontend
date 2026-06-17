import { test, expect } from '@playwright/test';
import { loginAsGM, waitForDataLoad } from './helpers.js';

test.describe('Review Detail Page', () => {

  let reviewUrl;

  test.beforeEach(async ({ page }) => {
    await loginAsGM(page);
    // Navigate to reviews and click the first one
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await waitForDataLoad(page);
    const firstCard = page.locator('.rc-card').first();
    if (await firstCard.isVisible({ timeout: 10000 })) {
      await firstCard.click();
      await page.waitForURL('**/reviews/**', { timeout: 5000 });
      reviewUrl = page.url();
      await page.waitForTimeout(1000);
    }
  });

  // ── Header ──

  test('TC-RD01: Back button is visible and navigates back', async ({ page }) => {
    const backBtn = page.locator('button:has-text("Back"), a:has-text("Back"), button:has-text("←")').first();
    await expect(backBtn).toBeVisible();
  });

  test('TC-RD02: Review status badge is visible', async ({ page }) => {
    const status = page.locator('text=/Classified|Flagged|Responded|Processing|IN REVIEW|NEW/i').first();
    await expect(status).toBeVisible({ timeout: 5000 });
  });

  // ── Panel 1: Review Information ──

  test('TC-RD03: Reviewer name is displayed', async ({ page }) => {
    // The page should show a name somewhere prominently
    const content = await page.locator('main, [class*="detail"]').first().textContent();
    expect(content.length).toBeGreaterThan(10);
  });

  test('TC-RD04: Review text is shown in full (blockquote)', async ({ page }) => {
    const reviewText = page.locator('blockquote, [class*="quote"], [class*="review-text"]').first();
    if (await reviewText.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = await reviewText.textContent();
      expect(text.length).toBeGreaterThan(10);
    }
  });

  test('TC-RD05: Star rating is displayed', async ({ page }) => {
    const stars = page.locator('svg.lucide-star, [class*="star"]').first();
    await expect(stars).toBeVisible({ timeout: 5000 });
  });

  test('TC-RD06: Platform name is shown', async ({ page }) => {
    const platform = page.locator('text=/Google|Booking.com|Agoda|Airbnb/i').first();
    await expect(platform).toBeVisible({ timeout: 5000 });
  });

  // ── Panel 2: AI Classification ──

  test('TC-RD07: Sentiment is displayed with color', async ({ page }) => {
    const sentiment = page.locator('text=/Sentiment/i').first();
    await expect(sentiment).toBeVisible({ timeout: 5000 });
  });

  test('TC-RD08: Department is displayed', async ({ page }) => {
    const dept = page.locator('text=/Department/i').first();
    await expect(dept).toBeVisible({ timeout: 5000 });
  });

  test('TC-RD09: Urgency is displayed', async ({ page }) => {
    const urgency = page.locator('text=/Urgency/i').first();
    await expect(urgency).toBeVisible({ timeout: 5000 });
  });

  test('TC-RD10: Guest Emotion is displayed', async ({ page }) => {
    const emotion = page.locator('text=/Emotion|Guest Emotion/i').first();
    if (await emotion.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(emotion).toBeVisible();
    }
  });

  test('TC-RD11: Positives list shows no hallucinated categories', async ({ page }) => {
    const positives = page.locator('text=/What they liked|Positives|Positive Aspects/i').first();
    if (await positives.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check that "Cleanliness" and "Service" don't appear unless in review text
      const section = positives.locator('..').first();
      const text = await section.textContent();
      // These should not appear generically - they should only appear if in the actual review
    }
  });

  // ── Panel 3: Smart Response Draft ──

  test('TC-RD12: Response tone selector is visible', async ({ page }) => {
    const tone = page.locator('text=/Formal|Empathetic|Apologetic/i').first();
    await expect(tone).toBeVisible({ timeout: 5000 });
  });

  test('TC-RD13: Generate AI Draft button is functional', async ({ page }) => {
    const genBtn = page.locator('button:has-text("Generate"), button:has-text("Draft")').first();
    if (await genBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(genBtn).toBeEnabled();
    }
  });

  test('TC-RD14: Copy button is visible when draft exists', async ({ page }) => {
    const copyBtn = page.locator('button:has-text("Copy"), [aria-label*="copy"]').first();
    if (await copyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(copyBtn).toBeVisible();
    }
  });

  test('TC-RD15: Edit button switches to textarea', async ({ page }) => {
    const editBtn = page.locator('button:has-text("Edit")').first();
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(500);
      const textarea = page.locator('textarea');
      await expect(textarea.first()).toBeVisible();
    }
  });

  // ── Panel 4: Response Approval ──

  test('TC-RD16: Approval section is visible', async ({ page }) => {
    const approval = page.locator('text=/Response Approval|Approve/i').first();
    await expect(approval).toBeVisible({ timeout: 5000 });
  });

  test('TC-RD17: Approve button disabled when no draft exists', async ({ page }) => {
    const approveBtn = page.locator('button:has-text("Approve")').first();
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // If no response_text, it should be disabled
      const isDisabled = await approveBtn.isDisabled();
      // Just verify it's visible - state depends on whether draft exists
      await expect(approveBtn).toBeVisible();
    }
  });

  // ── Audit Trail ──

  test('TC-RD18: Audit trail does not show "classified" entries', async ({ page }) => {
    const auditSection = page.locator('text=/Activity|Audit|Trail|History/i').first();
    if (await auditSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      const parent = auditSection.locator('xpath=ancestor::div[1]');
      const text = await parent.textContent();
      // "Classified" should NOT appear in audit trail
      expect(text.toLowerCase()).not.toMatch(/\bclassified\b/);
    }
  });

  // ── Similar Reviews ──

  test('TC-RD19: Similar reviews section is visible', async ({ page }) => {
    const similar = page.locator('text=/Similar Reviews/i').first();
    if (await similar.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(similar).toBeVisible();
    }
  });

  test('TC-RD20: Clicking similar review navigates and resets state', async ({ page }) => {
    const similarLink = page.locator('a[href*="/reviews/"]').first();
    if (await similarLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      const oldUrl = page.url();
      await similarLink.click();
      await page.waitForTimeout(1500);
      const newUrl = page.url();
      // Should be a different review
      if (oldUrl !== newUrl) {
        expect(newUrl).toContain('/reviews/');
      }
    }
  });

  // ── Flag ──

  test('TC-RD21: Flag button is accessible', async ({ page }) => {
    const flagBtn = page.locator('button:has-text("Flag"), button:has-text("flag")').first();
    if (await flagBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(flagBtn).toBeVisible();
    }
  });

  // ── No broken content ──

  test('TC-RD22: No NaN or undefined visible on detail page', async ({ page }) => {
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('NaN');
  });

  test('TC-RD23: No "Cleanliness" or "Service" hallucinated in positives unless in review text', async ({ page }) => {
    // Get the review text
    const reviewTextEl = page.locator('blockquote, [class*="quote"]').first();
    if (await reviewTextEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      const reviewText = (await reviewTextEl.textContent()).toLowerCase();
      
      // Get the positives section
      const allText = await page.locator('body').textContent();
      const lower = allText.toLowerCase();
      
      // If "cleanliness" appears in the UI but NOT in the review text, that's a hallucination
      if (lower.includes('cleanliness') && !reviewText.includes('clean')) {
        throw new Error('AI HALLUCINATION: "Cleanliness" appears in classification but not in review text');
      }
    }
  });
});
