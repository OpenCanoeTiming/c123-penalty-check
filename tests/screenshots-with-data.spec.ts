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
  // RaceSelector uses select[aria-label="Select race"] from DS Select component
  const raceSelector = page.locator('select[aria-label="Select race"]');
  if (await raceSelector.isVisible()) {
    // Get all options and find K1m 2. jízda
    const options = page.locator('select[aria-label="Select race"] option');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text?.includes('K1m') && text?.includes('2.')) {
        const value = await options.nth(i).getAttribute('value');
        if (value) {
          await raceSelector.selectOption(value);
          await page.waitForTimeout(2000); // Wait for data to load
          break;
        }
      }
    }
  }

  // Wait for grid to appear (with longer timeout) - uses .results-grid table tbody tr
  await page.waitForSelector('.results-grid tbody tr', { timeout: 15000 }).catch(() => {});
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

    // Use .penalty-cell for gate cells
    const cells = page.locator('.penalty-cell');
    const cellCount = await cells.count();
    if (cellCount > 5) {
      await cells.nth(5).click();
    }
    await page.waitForTimeout(300);
    await takeDocScreenshot(page, '09-grid-cell-focus');
  });

  test('10 - grid with gate group indicator active', async ({ page }) => {
    await waitForDataAndSelectRace(page);

    // Click on a gate group indicator button to show dimming effect
    const groupButtons = page.locator('.gate-group-indicator-btn');
    if (await groupButtons.count() > 0) {
      await groupButtons.first().click();
      await page.waitForTimeout(300);
    }
    await takeDocScreenshot(page, '10-gate-group-active');
  });

  test('13 - competitor actions menu', async ({ page }) => {
    await waitForDataAndSelectRace(page);

    // Use table row for right-click context menu
    const competitorRow = page.locator('.results-grid tbody tr').first();
    if (await competitorRow.isVisible()) {
      await competitorRow.click({ button: 'right' });
      await page.waitForTimeout(300);
    }
    await takeDocScreenshot(page, '13-competitor-actions');
  });

  test('14 - check progress in footer', async ({ page }) => {
    await waitForDataAndSelectRace(page);

    // Click check buttons for some finished competitors
    const checkButtons = page.locator('.check-btn:not([disabled])');
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

  test('18 - tablet landscape', async ({ page }) => {
    // iPad Pro 12.9" landscape
    await page.setViewportSize({ width: 1366, height: 1024 });
    await waitForDataAndSelectRace(page);
    await takeDocScreenshot(page, '18-tablet-landscape');
  });

  test('19 - tablet portrait', async ({ page }) => {
    // iPad Pro 12.9" portrait
    await page.setViewportSize({ width: 1024, height: 1366 });
    await waitForDataAndSelectRace(page);
    await takeDocScreenshot(page, '19-tablet-portrait');
  });

  // Main showcase screenshots (dark + tablet-light) for README
  test('dark - dark mode showcase', async ({ page }) => {
    test.setTimeout(60000); // Extend timeout for dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await waitForDataAndSelectRace(page);
    await takeDocScreenshot(page, 'dark');
  });

  test('tablet-light - tablet light mode showcase', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1024 });
    await waitForDataAndSelectRace(page);
    await takeDocScreenshot(page, 'tablet-light');
  });
});
