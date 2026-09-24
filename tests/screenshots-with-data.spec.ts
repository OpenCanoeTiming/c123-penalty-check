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

// Gate cells of the penalty grid - the stable, CSS-Modules-independent hook
// into today's ResultsGrid markup.
const GRID_CELLS = '[role="grid"] td[role="gridcell"]';

// Waits for the grid to render real rows. Skips the test visibly when it
// never does, rather than letting it screenshot an empty state and pass (#130).
async function waitForGrid(page: Page) {
  const appeared = await page
    .locator(GRID_CELLS)
    .first()
    .waitFor({ timeout: 15000 })
    .then(() => true, () => false);
  test.skip(!appeared, 'Penalty grid never rendered - no server connection or no race data');
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

  await waitForGrid(page);
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

    const cells = page.locator(GRID_CELLS);
    test.skip((await cells.count()) <= 5, 'Grid has too few gate cells to focus the sixth');
    await cells.nth(5).click();
    await page.waitForTimeout(300);
    await takeDocScreenshot(page, '09-grid-cell-focus');
  });

  test('10 - grid with gate group indicator active', async ({ page }) => {
    await waitForDataAndSelectRace(page);

    // Click on a gate group button in the grid header to show dimming effect.
    // These only render when the race has custom gate groups configured.
    const groupButtons = page.locator('[role="grid"] button[title*=": Gates "]');
    test.skip((await groupButtons.count()) === 0, 'No custom gate groups configured for this race');
    await groupButtons.first().click();
    await page.waitForTimeout(300);
    await takeDocScreenshot(page, '10-gate-group-active');
  });

  test('13 - competitor actions menu', async ({ page }) => {
    await waitForDataAndSelectRace(page);

    // Right-click a gate cell to open the penalty context menu
    await page.locator(GRID_CELLS).first().click({ button: 'right' });
    await page.getByRole('menu', { name: 'Penalty options' }).waitFor({ timeout: 5000 });
    await takeDocScreenshot(page, '13-competitor-actions');
  });

  test('14 - check progress in footer', async ({ page }) => {
    await waitForDataAndSelectRace(page);

    // Verify a few judged gates (Space) so the footer shows real progress.
    // A click commits focus only after useMultiTap's 300ms window.
    const judged = page.locator(`${GRID_CELLS}:not([aria-label$=", empty"])`);
    const count = await judged.count();
    test.skip(count === 0, 'No judged gates in this race');
    for (let i = 0; i < Math.min(3, count); i++) {
      await judged.nth(i).click();
      await page.waitForTimeout(400);
      await page.keyboard.press(' ');
      await page.waitForTimeout(300);
    }
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

  // Multi-day event tests (require Sunday morning recording replay)
  // Helper to skip discovery and connect directly
  async function setupDirectConnection(page: Page) {
    await page.addInitScript(() => {
      const raw = localStorage.getItem('c123-penalty-check-settings')
      const settings = raw ? JSON.parse(raw) : {}
      settings.serverUrl = 'ws://127.0.0.1:27123/ws'
      localStorage.setItem('c123-penalty-check-settings', JSON.stringify(settings))
      // Clear selected race to test auto-selection
      localStorage.removeItem('c123-penalty-check-selected-race')
    })
  }

  test('20 - multi-day race selector with dates', async ({ page }) => {
    await setupDirectConnection(page);
    await page.goto('/');
    await page.waitForTimeout(3000);

    await takeDocScreenshot(page, '20-multi-day-race-selector');
  });

  test('21 - multi-day grid with sunday race data', async ({ page }) => {
    await setupDirectConnection(page);
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Select a Sunday race (look for 19.4. in option text)
    const raceSelector = page.locator('select[aria-label="Select race"]');
    const options = page.locator('select[aria-label="Select race"] option');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text?.includes('19.4.') && text?.includes('K1M') && text?.includes('1st')) {
        const value = await options.nth(i).getAttribute('value');
        if (value) {
          await raceSelector.selectOption(value);
          break;
        }
      }
    }

    await waitForGrid(page);
    await page.waitForTimeout(1000);
    await takeDocScreenshot(page, '21-multi-day-sunday-grid');
  });

  test('22 - preloaded saturday race (REST data)', async ({ page }) => {
    await setupDirectConnection(page);
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Select a Saturday completed race (18.4.) — data comes from REST pre-load
    const raceSelector = page.locator('select[aria-label="Select race"]');
    const options = page.locator('select[aria-label="Select race"] option');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text?.includes('18.4.') && text?.includes('K1M') && text?.includes('1st')) {
        const value = await options.nth(i).getAttribute('value');
        if (value) {
          await raceSelector.selectOption(value);
          break;
        }
      }
    }

    // Wait for REST-fetched grid data
    await waitForGrid(page);
    await page.waitForTimeout(1000);
    await takeDocScreenshot(page, '22-preloaded-saturday-race');
  });

  // Verification states (penalty checks workflow, #4) — real, not injected.
  //
  // Screenshots 23/24/25 previously in this repo were provisional: their
  // CSS classes were applied by hand before App.tsx wired up verification at
  // all (see 21b338b). This pass drives the actual feature end to end -
  // Space/Shift+Space, the checks REST API, and the flag dialog - so the
  // states shown are exactly what getStatus() computes from real server
  // data, not a hand-picked class list.
  test('23/24/25 - verification states: plain, verified, stale, flagged', async ({ page }) => {
    test.setTimeout(60000);
    await setupDirectConnection(page);
    await page.goto('/');
    await page.waitForTimeout(3000);

    const raceSelector = page.locator('select[aria-label="Select race"]');
    await raceSelector.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    if (!(await raceSelector.isVisible().catch(() => false))) {
      test.skip(true, 'Race selector never appeared - no server connection');
      return;
    }

    // Pick the first race that actually renders a grid WITH at least one
    // judged gate - deliberately not tied to a specific race name or date,
    // since the recording backing this pipeline changes over time (see
    // DEVLOG: the rec-2025-12-28 recording this file originally targeted no
    // longer exists). A race that hasn't started yet can still render an
    // (empty) grid, so "has rows" alone isn't enough to pick from.
    const options = page.locator('select[aria-label="Select race"] option');
    const optionCount = await options.count();
    let raceId: string | null = null;
    for (let i = 0; i < optionCount; i++) {
      const value = await options.nth(i).getAttribute('value');
      if (!value) continue;
      await raceSelector.selectOption(value);
      const gotGrid = await page
        .waitForSelector('[role="grid"] td[role="gridcell"]', { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!gotGrid) continue;
      const hasJudgedGate = await page.evaluate(() =>
        [...document.querySelectorAll('td[role="gridcell"]')].some(
          (el) => !(el.getAttribute('aria-label') || '').endsWith(', empty')
        )
      );
      if (hasJudgedGate) {
        raceId = value;
        break;
      }
    }
    if (!raceId) {
      test.skip(true, 'No race with judged gate data found');
      return;
    }

    // A small custom gate group so Shift+Space demonstrates a real
    // multi-gate section verify rather than the single-gate fallback
    // (sectionGatesFor falls back to [gate] with no custom groups defined -
    // rule 1). Config is keyed by raceId, so it's written now that raceId
    // is known. useGateGroups only re-reads localStorage when its `raceId`
    // input changes (its effect depends on `storageKey`, not on storage
    // itself), so instead of reloading the page - which would re-run
    // setupDirectConnection's addInitScript and wipe the selected-race key,
    // losing the judged race just chosen above - this flips the selector to
    // a different race and back, which changes and then restores raceId
    // and so re-triggers that effect.
    await page.evaluate((rid) => {
      localStorage.setItem(
        `c123-penalty-check-gate-groups-${rid}`,
        JSON.stringify({
          version: 1,
          config: {
            groups: [{ id: 'screenshot-section', name: 'Section', gates: [1, 2, 3], color: '#0ea5e9' }],
            activeGroupId: null,
          },
        })
      );
    }, raceId);
    let otherValue: string | null = null;
    for (let i = 0; i < optionCount; i++) {
      const value = await options.nth(i).getAttribute('value');
      if (value && value !== raceId) {
        otherValue = value;
        break;
      }
    }
    if (otherValue) {
      await raceSelector.selectOption(otherValue);
      await page.waitForTimeout(300);
    }
    await raceSelector.selectOption(raceId);
    await waitForGrid(page);
    await page.waitForTimeout(500);

    // A click resolves through useMultiTap's 300ms disambiguation window
    // before `position` (and so cell focus) actually commits - acting
    // sooner races ahead of that and hits the *previous* focus, not the
    // cell just clicked.
    async function clickAndSettle(locator: ReturnType<typeof page.locator>) {
      await locator.click();
      await page.waitForTimeout(400);
    }

    // Gather everything needed to pick targets in one round trip: every
    // gate cell's {bib, gate, hasValue}, plus any bib whose row is
    // disabled (DNS/DNF/DSQ) - a flag placed there is the scenario that
    // originally motivated screenshot 25 (task 7 review: a flag must stay
    // visible on a disabled row's muted styling).
    const gridInfo = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('td[role="gridcell"]')].map((el) => {
        const label = el.getAttribute('aria-label') || '';
        const m = label.match(/^Gate (\d+), Bib\s*(\S+), (.+)$/);
        return m ? { gate: Number(m[1]), bib: m[2], hasValue: m[3] !== 'empty' } : null;
      }).filter((c): c is { gate: number; bib: string; hasValue: boolean } => c !== null);

      const disabledBibs = new Set<string>();
      for (const rh of document.querySelectorAll('td[role="rowheader"]')) {
        const label = rh.getAttribute('aria-label') || '';
        const bib = label.replace('Bib ', '');
        const statusCell = rh.parentElement?.children?.[2];
        const status = statusCell?.textContent?.trim() ?? '';
        if (/^(DNS|DNF|DSQ)$/.test(status)) disabledBibs.add(bib);
      }
      return { cells, disabledBibs: [...disabledBibs] };
    });

    const withValue = gridInfo.cells.filter((c) => c.hasValue);
    if (withValue.length === 0) {
      test.skip(true, 'No judged gates in this race');
      return;
    }

    // Target 1: verify a single gate (Space).
    const verifyTarget = withValue[0];
    await clickAndSettle(page.locator(`td[aria-label^="Gate ${verifyTarget.gate}, Bib ${verifyTarget.bib},"]`));
    await page.keyboard.press(' ');
    await page.waitForTimeout(300);

    // Target 2: verify the [1,2,3] section for the same competitor
    // (Shift+Space) - the multi-gate accelerator over the same primitive.
    const gate3 = page.locator(`td[aria-label^="Gate 3, Bib ${verifyTarget.bib},"]`);
    if (await gate3.count()) {
      await clickAndSettle(gate3);
      await page.keyboard.down('Shift');
      await page.keyboard.press(' ');
      await page.keyboard.up('Shift');
      await page.waitForTimeout(300);
    }

    // Target 3: verify a different gate, then mismatch its check via the
    // checks REST API directly - a real, documented interface (PUT
    // /api/checks/:raceId/check with an explicit `value`), and the only way
    // to produce a *lasting* stale cell in this sandbox: POST
    // /api/c123/scoring always invalidates the check on the gate it
    // touches, so there is no UI-only path that leaves a check pointing at
    // a superseded value for more than the roughly half-second of rule 4's
    // own optimistic round trip. This is exactly equivalent to a correction
    // made outside this app (e.g. on the original C123 terminal) - the
    // resulting state getStatus() computes is identical either way.
    const staleTarget = withValue.find(
      (c) => !(c.bib === verifyTarget.bib && (c.gate === verifyTarget.gate || c.gate <= 3))
    );
    if (staleTarget) {
      await clickAndSettle(page.locator(`td[aria-label^="Gate ${staleTarget.gate}, Bib ${staleTarget.bib},"]`));
      await page.keyboard.press(' ');
      await page.waitForTimeout(300);
      await page.evaluate(
        async ({ rid, bib, gate }) => {
          await fetch(`http://127.0.0.1:27123/api/checks/${rid}/check`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            // Any value that differs from the live one mismatches - the
            // exact number doesn't matter, only that it no longer matches.
            body: JSON.stringify({ bib, gate, value: 2 }),
          });
        },
        { rid: raceId, bib: staleTarget.bib, gate: staleTarget.gate }
      );
      await page.waitForTimeout(500);
    }

    // Target 4: create a flag. Prefer a gate on a disabled (DNS/DNF/DSQ)
    // row when this race has one - flags don't require a judged value
    // (unlike verify), so a blank gate on a disabled row is a valid target
    // and reproduces the scenario screenshot 25 was originally about.
    // Falls back to any remaining plain gate otherwise.
    let flagCellLocator: ReturnType<typeof page.locator>;
    if (gridInfo.disabledBibs.length > 0) {
      flagCellLocator = page.locator(`td[aria-label^="Gate 1, Bib ${gridInfo.disabledBibs[0]},"]`);
    } else {
      const flagTarget =
        withValue.find(
          (c) =>
            !(c.bib === verifyTarget.bib && (c.gate === verifyTarget.gate || c.gate <= 3)) &&
            !(staleTarget && c.bib === staleTarget.bib && c.gate === staleTarget.gate)
        ) ?? withValue[withValue.length - 1];
      flagCellLocator = page.locator(`td[aria-label^="Gate ${flagTarget.gate}, Bib ${flagTarget.bib},"]`);
    }
    await flagCellLocator.click({ button: 'right' });
    const menu = page.getByRole('menu', { name: 'Penalty options' });
    if (await menu.isVisible().catch(() => false)) {
      await menu.getByRole('menuitem', { name: /Add flag/ }).click();
      const commentBox = page.getByLabel('Comment');
      if (await commentBox.isVisible().catch(() => false)) {
        await commentBox.fill('Possible touch missed on this gate - please review.');
        await page.getByRole('button', { name: 'Add flag', exact: true }).click();
        await page.waitForTimeout(500);
      }
    }

    // 23 - the grid as an operator would normally see it: plain, verified,
    // stale and flagged cells together.
    await takeDocScreenshot(page, '23-verification-states-light');

    // 24 - focus guides: rest keyboard focus on the stale cell so its focus
    // ring is visible against the stale background pattern.
    if (staleTarget) {
      await clickAndSettle(page.locator(`td[aria-label^="Gate ${staleTarget.gate}, Bib ${staleTarget.bib},"]`));
    }
    await takeDocScreenshot(page, '24-verification-focus-guides-light');

    // 25 - close-up on the flagged cell. Re-queries the bounding box fresh
    // right before each capture rather than reusing one taken earlier -
    // moving focus to the stale cell for screenshot 24 can auto-scroll the
    // grid (it scrolls the focused cell into view), which would otherwise
    // leave an earlier bounding box pointing at whatever now sits at its
    // old page coordinates instead of the flagged cell.
    async function captureFlagCloseUp(path: string) {
      await flagCellLocator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const box = await flagCellLocator.boundingBox();
      if (!box) return;
      await page.screenshot({
        path,
        clip: {
          x: Math.max(0, box.x - 150),
          y: Math.max(0, box.y - 60),
          width: 400,
          height: 160,
        },
      });
      console.log('[Screenshot] Saved:', path);
    }

    await captureFlagCloseUp(`${DOCS_SCREENSHOTS}/25-flag-on-disabled-row-light.png`);

    // Dark mode: same final state, just re-painted - no need to redo the
    // interactions above.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(300);
    await takeDocScreenshot(page, '23-verification-states-dark');
    await takeDocScreenshot(page, '24-verification-focus-guides-dark');
    await captureFlagCloseUp(`${DOCS_SCREENSHOTS}/25-flag-on-disabled-row-dark.png`);
  });
});
