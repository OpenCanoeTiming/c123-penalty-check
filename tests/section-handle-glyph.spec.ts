import { test, expect, type Page } from '@playwright/test';

/**
 * Regression for task-8 re-review finding N-1: the section-verify handle
 * (ResultsGrid.module.css .sectionHandle) is a real, visible, opaque overlay
 * docked to the cell's right edge (see ResultsGrid review history). Its
 * width has to stay narrow enough to never paint over the penalty digit -
 * jsdom can't catch this (no real layout/font metrics), which is exactly how
 * a 12px width shipped and clipped the "0" of "50" by ~2.75px on a 36px
 * fine-pointer cell before anyone measured it in a real browser.
 *
 * This spec renders the real ResultsGrid (via grid-harness.html - see that
 * file and src/test/grid-harness-entry.tsx) and measures the actual
 * rendered glyph against the actual handle, at both pointer sizes the CSS
 * distinguishes (@media (pointer: coarse) in ResultsGrid.module.css).
 */

interface GlyphCheck {
  bib: string;
  value: string;
  glyphRight: number;
  handleLeft: number;
  clearance: number;
}

async function measureGate8Glyphs(page: Page): Promise<GlyphCheck[]> {
  await page.goto('/grid-harness.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('[class*="_content_"]');

  return page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('[class*="_penaltyCell_"]'));
    const results: { bib: string; value: string; glyphRight: number; handleLeft: number; clearance: number }[] = [];

    for (const bib of ['1', '2', '3']) {
      const cell = cells.find((el) => el.getAttribute('aria-label')?.startsWith(`Gate 8, Bib ${bib},`));
      if (!cell) throw new Error(`gate 8 cell for bib ${bib} not found`);

      const handle = cell.querySelector('[class*="_sectionHandle_"]');
      if (!handle) throw new Error(`section handle for bib ${bib} not found`);

      // The digit is the cell's own direct text node (rendered before the
      // handle span in tree order - see PenaltyCell).
      const textNode = Array.from(cell.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
      if (!textNode) throw new Error(`no digit text node in gate 8 cell for bib ${bib}`);

      const range = document.createRange();
      range.selectNodeContents(textNode);
      const glyphRect = range.getBoundingClientRect();
      const handleRect = (handle as HTMLElement).getBoundingClientRect();

      results.push({
        bib,
        value: textNode.textContent!.trim(),
        glyphRight: glyphRect.right,
        handleLeft: handleRect.left,
        clearance: handleRect.left - glyphRect.right,
      });
    }

    return results;
  });
}

test.describe('Section handle does not clip the penalty digit', () => {
  test('fine pointer (mouse, 36px cell): 0, 2 and 50 all stay clear of the handle', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 700 });
    const checks = await measureGate8Glyphs(page);

    expect(checks.map((c) => c.value)).toEqual(['0', '2', '50']);
    for (const check of checks) {
      // Positive clearance = glyph's right edge is left of the handle's
      // left edge, i.e. not painted over. 0px tolerance, not a fudge factor -
      // this is the exact claim the finding measured (12px clipped "50" by
      // ~2.75px; 8px clears it by ~1.25px).
      expect(check.clearance, `value "${check.value}" (bib ${check.bib}) clearance`).toBeGreaterThan(0);
    }
  });

  test('coarse pointer (touch, 48px cell): 0, 2 and 50 all stay clear of the handle', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1024, height: 700 },
      hasTouch: true,
    });
    const page = await context.newPage();
    const checks = await measureGate8Glyphs(page);

    expect(checks.map((c) => c.value)).toEqual(['0', '2', '50']);
    for (const check of checks) {
      expect(check.clearance, `value "${check.value}" (bib ${check.bib}) clearance`).toBeGreaterThan(0);
    }

    await context.close();
  });

  // No team-race cumulative-value case (52/100/150) here on purpose. The
  // data model carries them (src/types/checks.ts), but PenaltyCell has no UI
  // path that renders them as text today - they fall through to
  // .penaltyEmpty with value = '', so there is no glyph to measure yet, and
  // a test asserting that would only be asserting a property of this
  // harness's fixture data, not of PenaltyCell (a prior version of this spec
  // did exactly that, and stayed green under a mutation that made
  // PenaltyCell render those values as text - a vacuous test is worse than
  // no test). Whoever gives team values a UI path has to re-run this whole
  // glyph-fit question in the boundary cell specifically - it is the
  // narrowest place a three-character value can land, at either pointer
  // size, and 8px/12px do not obviously survive three characters.
});
