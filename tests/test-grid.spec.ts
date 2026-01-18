import { test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('Grid Scroll Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Load our test HTML directly (no server needed)
    const htmlPath = join(process.cwd(), 'test-grid.html');
    await page.goto(`file://${htmlPath}`);
    await page.waitForTimeout(100);
  });

  test('initial state - all headers visible', async ({ page }) => {
    await page.screenshot({ path: 'test-screenshots/01-initial.png' });

    const corner = page.locator('.corner');
    const colHeaders = page.locator('.colHeaders');
    const rowHeaders = page.locator('.rowHeaders');
    const groupsCorner = page.locator('.groupsCorner');
    const groupsHeader = page.locator('.groupsHeader');

    await expect(corner).toBeVisible();
    await expect(colHeaders).toBeVisible();
    await expect(rowHeaders).toBeVisible();
    await expect(groupsCorner).toBeVisible();
    await expect(groupsHeader).toBeVisible();

    // Gate 1 visible in header
    const gate1 = colHeaders.locator('th').first();
    await expect(gate1).toHaveText('1');
    await expect(gate1).toBeVisible();

    // First competitor visible
    const firstBib = rowHeaders.locator('.colBib').first();
    await expect(firstBib).toHaveText('1');
  });

  test('horizontal scroll - row headers stay fixed', async ({ page }) => {
    const content = page.locator('.content');
    const rowHeaders = page.locator('.rowHeaders');

    const rowHeadersInitial = await rowHeaders.boundingBox();
    const firstBib = rowHeaders.locator('.colBib').first();

    // Scroll right
    await content.evaluate((el) => { el.scrollLeft = 300; });
    await page.waitForTimeout(50);

    await page.screenshot({ path: 'test-screenshots/02-scroll-right.png' });

    // Row headers should NOT have moved horizontally
    const rowHeadersAfter = await rowHeaders.boundingBox();
    expect(rowHeadersAfter!.x).toBe(rowHeadersInitial!.x);

    // First bib still visible
    await expect(firstBib).toBeVisible();
    await expect(firstBib).toHaveText('1');

    const scrollPos = await content.evaluate((el) => el.scrollLeft);
    expect(scrollPos).toBe(300);
  });

  test('vertical scroll - column headers stay fixed', async ({ page }) => {
    const content = page.locator('.content');
    const colHeaders = page.locator('.colHeaders');
    const corner = page.locator('.corner');

    const colHeadersInitial = await colHeaders.boundingBox();
    const cornerInitial = await corner.boundingBox();

    // Scroll down
    await content.evaluate((el) => { el.scrollTop = 200; });
    await page.waitForTimeout(50);

    await page.screenshot({ path: 'test-screenshots/03-scroll-down.png' });

    // Column headers should NOT have moved
    const colHeadersAfter = await colHeaders.boundingBox();
    const cornerAfter = await corner.boundingBox();

    expect(colHeadersAfter!.y).toBe(colHeadersInitial!.y);
    expect(cornerAfter!.y).toBe(cornerInitial!.y);

    // Gate 1 header still visible
    const gate1 = colHeaders.locator('th').first();
    await expect(gate1).toBeVisible();
  });

  test('both directions scroll - corner stays fixed', async ({ page }) => {
    const content = page.locator('.content');
    const corner = page.locator('.corner');
    const rowHeaders = page.locator('.rowHeaders');
    const colHeaders = page.locator('.colHeaders');

    const cornerInitial = await corner.boundingBox();

    // Scroll both directions
    await content.evaluate((el) => {
      el.scrollLeft = 400;
      el.scrollTop = 300;
    });
    await page.waitForTimeout(50);

    await page.screenshot({ path: 'test-screenshots/04-scroll-both.png' });

    // Corner should NOT have moved
    const cornerAfter = await corner.boundingBox();
    expect(cornerAfter!.x).toBe(cornerInitial!.x);
    expect(cornerAfter!.y).toBe(cornerInitial!.y);

    // Headers in sync
    const colScrollLeft = await colHeaders.evaluate((el) => el.scrollLeft);
    const rowScrollTop = await rowHeaders.evaluate((el) => el.scrollTop);
    const contentScrollLeft = await content.evaluate((el) => el.scrollLeft);
    const contentScrollTop = await content.evaluate((el) => el.scrollTop);

    expect(colScrollLeft).toBe(contentScrollLeft);
    expect(rowScrollTop).toBe(contentScrollTop);
  });

  test('scroll to end - last content visible', async ({ page }) => {
    const content = page.locator('.content');

    // Scroll to bottom-right corner
    await content.evaluate((el) => {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
      el.scrollTop = el.scrollHeight - el.clientHeight;
    });
    await page.waitForTimeout(50);

    await page.screenshot({ path: 'test-screenshots/05-scroll-end.png' });

    // Last cell visible
    const lastCell = content.locator('tr').last().locator('td').last();
    await expect(lastCell).toBeVisible();

    // Row headers scrolled
    const rowHeaders = page.locator('.rowHeaders');
    const scrollTop = await rowHeaders.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeGreaterThan(0);
  });

  test('content does not overlap headers', async ({ page }) => {
    const content = page.locator('.content');
    const colHeaders = page.locator('.colHeaders');
    const rowHeaders = page.locator('.rowHeaders');

    await content.evaluate((el) => {
      el.scrollLeft = 100;
      el.scrollTop = 100;
    });
    await page.waitForTimeout(50);

    const colHeadersBox = await colHeaders.boundingBox();
    const rowHeadersBox = await rowHeaders.boundingBox();
    const contentBox = await content.boundingBox();

    // Content starts after row headers (horizontally)
    expect(contentBox!.x).toBeGreaterThanOrEqual(rowHeadersBox!.x + rowHeadersBox!.width - 1);

    // Content starts after col headers (vertically)
    expect(contentBox!.y).toBeGreaterThanOrEqual(colHeadersBox!.y + colHeadersBox!.height - 1);

    await page.screenshot({ path: 'test-screenshots/06-no-overlap.png' });
  });
});
