/**
 * Shared helpers for all Playwright tests
 * - Login helper
 * - Common selectors
 * - Utility functions
 */

/**
 * Log in as GM user. Fills email + password and submits.
 * Waits for dashboard to fully load before returning.
 */
export async function loginAsGM(page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  // Fill email
  await page.locator('input[type="email"]').fill('admin@gmail.com');
  // Fill password
  await page.locator('input[type="password"]').fill('password123');
  // Submit
  await page.locator('button[type="submit"]').click();
  // Wait for navigation to dashboard
  await page.waitForURL('**/', { timeout: 15000 });
  // Wait for app to fully load
  await page.waitForSelector('nav', { timeout: 10000 });
}

/**
 * Navigate to a page after login. Ensures we're logged in first.
 */
export async function navigateTo(page, path) {
  const currentUrl = page.url();
  if (currentUrl.includes('/login') || !currentUrl.includes('localhost')) {
    await loginAsGM(page);
  }
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000); // Let React render
}

/**
 * Wait for skeleton loaders to disappear
 */
export async function waitForDataLoad(page) {
  // Wait until no skeletons are visible
  await page.waitForFunction(() => {
    return document.querySelectorAll('[class*="skeleton"], [class*="Skeleton"], [class*="animate-pulse"]').length === 0;
  }, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
}
