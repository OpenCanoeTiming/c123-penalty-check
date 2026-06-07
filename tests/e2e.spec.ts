import { test, expect } from '@playwright/test';

/**
 * E2E Tests for C123 Penalty Check Application
 *
 * These tests verify actual application behavior without a real server.
 * They test UI navigation, settings, and basic functionality.
 */

// Only run on chromium to simplify test execution
test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');

test.describe('Connection Tests', () => {
  test('should show connection status component', async ({ page }) => {
    await page.goto('/');

    // Wait a bit for connection attempt
    await page.waitForTimeout(1000);

    // Should show connection status
    const status = page.locator('[data-testid="connection-status"]');
    await expect(status).toBeVisible();
  });

  test('should display empty state when no races', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Should show some empty state (could be no-races or loading/connecting)
    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();
  });

  test('should show connection status text', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Connection status should show some text
    const status = page.locator('[data-testid="connection-status"]');
    await expect(status).toBeVisible();

    // Should have some status text (connected, connecting, or disconnected)
    const statusText = await status.textContent();
    expect(statusText).toBeTruthy();
  });
});

test.describe('Settings Panel Tests', () => {
  test('should open settings panel from header button', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Click settings button
    await page.click('button[aria-label="Settings"]');
    await page.waitForTimeout(300);

    // Settings panel should be visible
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
  });

  test('should close settings with close button', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Open settings
    await page.click('button[aria-label="Settings"]');
    await page.waitForTimeout(300);

    // Click close button
    await page.click('[data-testid="settings-close"]');
    await page.waitForTimeout(300);

    // Settings should be hidden
    await expect(
      page.locator('[data-testid="settings-panel"]')
    ).not.toBeVisible();
  });

  test('should open settings with keyboard shortcut', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Press Ctrl+,
    await page.keyboard.press('Control+,');
    await page.waitForTimeout(300);

    // Settings should be visible
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
  });

  test('should close settings with Escape', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Open settings
    await page.click('button[aria-label="Settings"]');
    await page.waitForTimeout(300);

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Settings should be hidden
    await expect(
      page.locator('[data-testid="settings-panel"]')
    ).not.toBeVisible();
  });

  test('should switch to keyboard tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Open settings
    await page.click('button[aria-label="Settings"]');
    await page.waitForTimeout(300);

    // Click on Keyboard tab
    await page.click('[data-testid="settings-tab-keyboard"]');
    await page.waitForTimeout(200);

    // Keyboard shortcuts content should be visible
    await expect(
      page.locator('[data-testid="settings-keyboard-content"]')
    ).toBeVisible();
  });

  test('should switch to display tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Open settings
    await page.click('button[aria-label="Settings"]');
    await page.waitForTimeout(300);

    // Click on Display tab
    await page.click('[data-testid="settings-tab-display"]');
    await page.waitForTimeout(200);

    // Display content should be visible (check for checkboxes)
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();
  });

  test('should show default server URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Open settings
    await page.click('button[aria-label="Settings"]');
    await page.waitForTimeout(300);

    // Server URL input should have default value
    const urlInput = page.locator('[data-testid="settings-server-url"]');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveValue(/localhost:27123/);
  });

  test('should validate server URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Open settings
    await page.click('button[aria-label="Settings"]');
    await page.waitForTimeout(300);

    // Clear and enter invalid URL
    const urlInput = page.locator('[data-testid="settings-server-url"]');
    await urlInput.fill('invalid-url');
    await page.waitForTimeout(200);

    // Should show error message
    await expect(page.getByText(/Invalid URL|protocol/i)).toBeVisible();
  });
});

test.describe('Layout Tests', () => {
  test('should display header', async ({ page }) => {
    await page.goto('/');

    // Header should exist
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should display footer with version', async ({ page }) => {
    await page.goto('/');

    // Footer should exist with version info
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('C123 Penalty Check');
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(500);

    // Settings button should still be visible
    const settingsButton = page.locator('button[aria-label="Settings"]');
    await expect(settingsButton).toBeVisible();

    // Open settings
    await settingsButton.click();
    await page.waitForTimeout(300);

    // Settings panel should be visible
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
  });
});

test.describe('Accessibility Tests', () => {
  test('should have proper focus management in settings modal', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Open settings
    await page.click('button[aria-label="Settings"]');
    await page.waitForTimeout(300);

    // Tab through elements - focus should stay in modal
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Active element should be inside settings panel
    const isInsidePanel = await page.evaluate(
      () => document.activeElement?.closest('[data-testid="settings-panel"]') !== null
    );
    expect(isInsidePanel).toBe(true);
  });

  test('settings modal should have proper ARIA attributes', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Open settings
    await page.click('button[aria-label="Settings"]');
    await page.waitForTimeout(300);

    // Check for dialog role
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('tabs should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Open settings
    await page.click('button[aria-label="Settings"]');
    await page.waitForTimeout(300);

    // Check for tablist role
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();

    // Check for tab role on tab buttons
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3);
  });
});
