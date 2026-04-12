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

test.describe('Screenshot Tests - Static States', () => {
  // Skip network discovery by using non-default server URL (127.0.0.1 vs localhost)
  // so tests go straight to the main UI instead of the discovering screen
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const raw = localStorage.getItem('c123-scoring-settings')
      const settings = raw ? JSON.parse(raw) : {}
      settings.serverUrl = 'ws://127.0.0.1:27123/ws'
      localStorage.setItem('c123-scoring-settings', JSON.stringify(settings))
    })
  })

  test('01 - disconnected state', async ({ page }) => {
    await page.goto('/');
    // Wait for connection attempts to fail and show disconnected state
    await page.waitForTimeout(5000);
    await takeDocScreenshot(page, '01-disconnected');
  });

  test('02 - connecting state', async ({ page }) => {
    await page.goto('/');
    // Capture quickly while still connecting
    await page.waitForTimeout(100);
    await takeDocScreenshot(page, '02-connecting');
  });

  test('03 - settings panel (Server tab)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    // Settings button in header with aria-label
    await page.click('button[aria-label="Settings"]');
    // Wait for modal to open
    await page.waitForSelector('[data-testid="settings-panel"]', { timeout: 5000 });
    await page.waitForTimeout(300);
    await takeDocScreenshot(page, '03-settings-panel');
  });

  test('04 - settings keyboard tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.click('button[aria-label="Settings"]');
    await page.waitForSelector('[data-testid="settings-panel"]', { timeout: 5000 });
    await page.waitForTimeout(300);
    // Click Keyboard tab using data-testid
    await page.click('[data-testid="settings-tab-keyboard"]');
    await page.waitForTimeout(300);
    await takeDocScreenshot(page, '04-settings-keyboard');
  });

  test('05 - settings display tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.click('button[aria-label="Settings"]');
    await page.waitForSelector('[data-testid="settings-panel"]', { timeout: 5000 });
    await page.waitForTimeout(300);
    // Click Display tab using data-testid
    await page.click('[data-testid="settings-tab-display"]');
    await page.waitForTimeout(300);
    await takeDocScreenshot(page, '05-settings-display');
  });
});
