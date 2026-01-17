import { test, Page } from '@playwright/test';

// Force serial execution
test.describe.configure({ mode: 'serial' });

// Output directory for documentation screenshots
const DOCS_SCREENSHOTS = './docs/screenshots';

// Helper to take screenshot and save to docs
async function takeDocScreenshot(page: Page, name: string) {
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${DOCS_SCREENSHOTS}/${name}.png`,
    fullPage: false,
  });
  console.log(`[Screenshot] Saved: ${name}.png`);
}

// Helper to wait for Results data and select K1m race
async function waitForDataAndSelectRace(page: Page) {
  await page.goto('/');

  // Clear localStorage to reset race selection (must be after navigation)
  await page.evaluate(() => localStorage.clear());

  // Reload to apply cleared storage
  await page.reload();

  // Wait for connection
  await page.waitForTimeout(2000);

  // Try to select K1m 2. jízda (the race with Results data in replay)
  const raceSelector = page.locator('select');
  if (await raceSelector.isVisible()) {
    // Find K1m 2. jízda option specifically
    const k1m2Option = page.locator('select option:has-text("K1m"):has-text("2. jízda")').first();
    if (await k1m2Option.count() > 0) {
      const value = await k1m2Option.getAttribute('value');
      if (value) {
        await raceSelector.selectOption(value);
        await page.waitForTimeout(2000); // Wait for data to load
      }
    }
  }

  // Wait for grid to appear (with longer timeout)
  await page.waitForSelector('.competitor-row', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
}

// These tests require c123-server running with data
// Run: cd ../c123-server && npm start
// Or: replay-server + c123-server
test.describe('Screenshot Tests - With Data', () => {
  test('07 - race selector with multiple races', async ({ page }) => {
    await waitForDataAndSelectRace(page);
    await takeDocScreenshot(page, '07-race-selector');
  });

  test('08 - grid with finished competitors', async ({ page }) => {
    await waitForDataAndSelectRace(page);
    await takeDocScreenshot(page, '08-grid-finished');
  });

  test('09 - grid with focus on cell', async ({ page }) => {
    await waitForDataAndSelectRace(page);

    const cells = page.locator('.gate-cell');
    const cellCount = await cells.count();
    if (cellCount > 5) {
      await cells.nth(5).click();
    }
    await page.waitForTimeout(300);
    await takeDocScreenshot(page, '09-grid-cell-focus');
  });

  test('10 - grid with on-course section', async ({ page }) => {
    await waitForDataAndSelectRace(page);

    await page.evaluate(() => {
      const grid = document.querySelector('.on-course-grid');
      if (grid) {
        grid.scrollTop = grid.scrollHeight;
      }
    });
    await page.waitForTimeout(300);
    await takeDocScreenshot(page, '10-grid-oncourse-section');
  });

  test('11 - gate group switcher', async ({ page }) => {
    await waitForDataAndSelectRace(page);
    await takeDocScreenshot(page, '11-gate-group-switcher');
  });

  test('12 - gate group editor', async ({ page }) => {
    await waitForDataAndSelectRace(page);

    const editButton = page.locator('.gate-group-switcher .edit-button');
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(500);
    }
    await takeDocScreenshot(page, '12-gate-group-editor');
  });

  test('13 - competitor actions menu', async ({ page }) => {
    await waitForDataAndSelectRace(page);

    const competitorRow = page.locator('.competitor-row').first();
    if (await competitorRow.isVisible()) {
      await competitorRow.click({ button: 'right' });
      await page.waitForTimeout(300);
    }
    await takeDocScreenshot(page, '13-competitor-actions');
  });

  test('14 - check progress in footer', async ({ page }) => {
    await waitForDataAndSelectRace(page);

    // Try to click check buttons if they are enabled (only for finished competitors)
    const checkButtons = page.locator('.check-button:not([disabled])');
    const count = await checkButtons.count();
    for (let i = 0; i < Math.min(3, count); i++) {
      try {
        await checkButtons.nth(i).click({ timeout: 1000 });
        await page.waitForTimeout(100);
      } catch {
        // Button might be disabled or detached, continue
      }
    }
    await page.waitForTimeout(300);
    await takeDocScreenshot(page, '14-check-progress');
  });

  test('15 - mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForDataAndSelectRace(page);
    await takeDocScreenshot(page, '15-mobile-view');
  });

  test('17 - dark mode', async ({ page }) => {
    // Enable dark mode via media query emulation
    await page.emulateMedia({ colorScheme: 'dark' });
    await waitForDataAndSelectRace(page);
    await takeDocScreenshot(page, '17-dark-mode');
  });
});
