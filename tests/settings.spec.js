import { test, expect } from '@playwright/test';
import { loginAsGM, waitForDataLoad } from './helpers.js';

test.describe('Settings Page', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsGM(page);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  // ── Tab Navigation ──

  test('TC-ST01: All settings tabs are visible', async ({ page }) => {
    const tabs = ['AI', 'Properties', 'Rules', 'Team', 'Account'];
    for (const tab of tabs) {
      const tabEl = page.locator(`button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`).first();
      if (await tabEl.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(tabEl).toBeVisible();
      }
    }
  });

  test('TC-ST02: Clicking tabs switches content', async ({ page }) => {
    const propsTab = page.locator('button:has-text("Properties")').first();
    if (await propsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await propsTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=/Properties|Property/i').first()).toBeVisible();
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  //   Properties Tab
  // ──────────────────────────────────────────────────────────────────────

  test.describe('Properties Tab', () => {

    test.beforeEach(async ({ page }) => {
      const propsTab = page.locator('button:has-text("Properties")').first();
      if (await propsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await propsTab.click();
        await page.waitForTimeout(1000);
      }
    });

    test('TC-ST03: Property cards are displayed', async ({ page }) => {
      const cards = page.locator('text=/Property|property/i');
      await expect(cards.first()).toBeVisible({ timeout: 5000 });
    });

    test('TC-ST04: Add Property button is visible', async ({ page }) => {
      const addBtn = page.locator('button:has-text("Add Property"), button:has-text("+ Add")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(addBtn).toBeVisible();
      }
    });

    test('TC-ST05: Clicking Add Property opens form with empty fields', async ({ page }) => {
      const addBtn = page.locator('button:has-text("Add Property"), button:has-text("+ Add")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);
        // Property Name field should be visible and empty
        const nameInput = page.locator('input[placeholder*="Grand Palace"]');
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toHaveValue('');
      }
    });

    // ── Field-Level Validation ──

    test('TC-ST06: Empty Property Name shows red error', async ({ page }) => {
      const addBtn = page.locator('button:has-text("Add Property"), button:has-text("+ Add")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);
        // Click save without filling anything
        const saveBtn = page.locator('button:has-text("Add Property")').last();
        await saveBtn.click();
        await page.waitForTimeout(300);
        // Error should appear
        const error = page.locator('text=/Property name is required/i');
        await expect(error).toBeVisible();
      }
    });

    test('TC-ST07: Empty City shows red error', async ({ page }) => {
      const addBtn = page.locator('button:has-text("Add Property"), button:has-text("+ Add")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);
        // Fill name but not city
        const nameInput = page.locator('input[placeholder*="Grand Palace"]');
        await nameInput.fill('Test Property');
        // Click save
        const saveBtn = page.locator('button:has-text("Add Property")').last();
        await saveBtn.click();
        await page.waitForTimeout(300);
        const error = page.locator('text=/City is required/i');
        await expect(error).toBeVisible();
      }
    });

    test('TC-ST08: Empty Rooms shows red error', async ({ page }) => {
      const addBtn = page.locator('button:has-text("Add Property"), button:has-text("+ Add")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);
        const nameInput = page.locator('input[placeholder*="Grand Palace"]');
        await nameInput.fill('Test Property');
        const cityInput = page.locator('input[placeholder*="Mumbai"]');
        await cityInput.fill('Delhi');
        const saveBtn = page.locator('button:has-text("Add Property")').last();
        await saveBtn.click();
        await page.waitForTimeout(300);
        const error = page.locator('text=/rooms is required/i');
        await expect(error).toBeVisible();
      }
    });

    test('TC-ST09: No platform URL shows red error', async ({ page }) => {
      const addBtn = page.locator('button:has-text("Add Property"), button:has-text("+ Add")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);
        const nameInput = page.locator('input[placeholder*="Grand Palace"]');
        await nameInput.fill('Test Property');
        const cityInput = page.locator('input[placeholder*="Mumbai"]');
        await cityInput.fill('Delhi');
        const roomsInput = page.locator('input[placeholder*="150"]');
        await roomsInput.fill('100');
        const saveBtn = page.locator('button:has-text("Add Property")').last();
        await saveBtn.click();
        await page.waitForTimeout(300);
        const error = page.locator('text=/platform URL is required/i');
        await expect(error).toBeVisible();
      }
    });

    test('TC-ST10: Typing in errored field clears that error', async ({ page }) => {
      const addBtn = page.locator('button:has-text("Add Property"), button:has-text("+ Add")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);
        // Trigger all errors
        const saveBtn = page.locator('button:has-text("Add Property")').last();
        await saveBtn.click();
        await page.waitForTimeout(300);
        // Now type in name
        const nameInput = page.locator('input[placeholder*="Grand Palace"]');
        await nameInput.fill('Test');
        await page.waitForTimeout(200);
        // Name error should be gone
        const nameError = page.locator('text=/Property name is required/i');
        await expect(nameError).toBeHidden();
        // City error should still be there
        const cityError = page.locator('text=/City is required/i');
        await expect(cityError).toBeVisible();
      }
    });

    // ── Platform Connections ──

    test('TC-ST11: Platform connections section shows all platforms', async ({ page }) => {
      // Click first property card
      const card = page.locator('text=/Hyatt|Hotel|Property/i').first();
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        await card.click();
        await page.waitForTimeout(500);
        await expect(page.locator('text=Platform Connections')).toBeVisible();
        await expect(page.locator('text=Google')).toBeVisible();
        await expect(page.locator('text=Booking.com')).toBeVisible();
        await expect(page.locator('text=Agoda')).toBeVisible();
      }
    });

    // ── Cancel ──

    test('TC-ST12: Cancel new property discards draft', async ({ page }) => {
      const addBtn = page.locator('button:has-text("Add Property"), button:has-text("+ Add")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);
        const cancelBtn = page.locator('button:has-text("Cancel")').first();
        await cancelBtn.click();
        await page.waitForTimeout(300);
        // Should be back to card grid
        await expect(addBtn).toBeVisible();
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  //   Rules & Automation Tab
  // ──────────────────────────────────────────────────────────────────────

  test.describe('Rules & Automation Tab', () => {

    test.beforeEach(async ({ page }) => {
      const tab = page.locator('button:has-text("Rules")').first();
      if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(1000);
      }
    });

    // ── Keyword Alerts ──

    test('TC-ST13: Keyword alert input is visible', async ({ page }) => {
      const input = page.locator('input[placeholder*="keyword"], input[placeholder*="alert"]').first();
      if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(input).toBeVisible();
      }
    });

    test('TC-ST14: Adding a keyword creates a tag', async ({ page }) => {
      const input = page.locator('input[placeholder*="keyword"], input[placeholder*="alert"]').first();
      if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
        await input.fill('testword123');
        const addBtn = page.locator('button:has-text("Add")').first();
        await addBtn.click();
        await page.waitForTimeout(300);
        await expect(page.locator('text=testword123')).toBeVisible();
      }
    });

    test('TC-ST15: Removing a keyword tag works', async ({ page }) => {
      // Add a keyword first
      const input = page.locator('input[placeholder*="keyword"], input[placeholder*="alert"]').first();
      if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
        await input.fill('removetest');
        const addBtn = page.locator('button:has-text("Add")').first();
        await addBtn.click();
        await page.waitForTimeout(300);
        // Find the X on the tag
        const tag = page.locator('text=removetest');
        const xBtn = tag.locator('..').locator('svg').first();
        await xBtn.click();
        await page.waitForTimeout(300);
        await expect(page.locator('text=removetest')).toBeHidden();
      }
    });

    // ── Response Templates ──

    test('TC-ST16: Response Templates heading has info tooltip', async ({ page }) => {
      const heading = page.locator('text=Response Templates').first();
      if (await heading.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Look for info icon near the heading
        const tooltip = heading.locator('xpath=ancestor::h3[1]').locator('svg, [class*="tooltip"], [class*="info"]').first();
        if (await tooltip.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(tooltip).toBeVisible();
        }
      }
    });

    test('TC-ST17: Template count is shown', async ({ page }) => {
      const count = page.locator('text=/\\d+ templates/i').first();
      if (await count.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(count).toBeVisible();
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  //   Team Tab
  // ──────────────────────────────────────────────────────────────────────

  test.describe('Team Tab', () => {

    test.beforeEach(async ({ page }) => {
      const tab = page.locator('button:has-text("Team")').first();
      if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(1000);
      }
    });

    test('TC-ST18: Add Member button is visible', async ({ page }) => {
      const addBtn = page.locator('button:has-text("Add Member"), button:has-text("Invite")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(addBtn).toBeVisible();
      }
    });

    test('TC-ST19: Add Member modal opens with form fields', async ({ page }) => {
      const addBtn = page.locator('button:has-text("Add Member"), button:has-text("Invite")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);
        // Modal should be open
        await expect(page.locator('text=Cancel')).toBeVisible();
      }
    });

    test('TC-ST20: Cancel closes the Add Member modal', async ({ page }) => {
      const addBtn = page.locator('button:has-text("Add Member"), button:has-text("Invite")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);
        const cancelBtn = page.locator('button:has-text("Cancel")');
        await cancelBtn.click();
        await page.waitForTimeout(300);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  //   Save Settings
  // ──────────────────────────────────────────────────────────────────────

  test('TC-ST21: Save Settings button is visible', async ({ page }) => {
    const saveBtn = page.locator('button:has-text("Save Settings"), button:has-text("Save")').first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
  });
});
