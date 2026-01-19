# C123-PENALTY-CHECK - Implementation Plan

## Implementation Status

| Phase | Name | Status |
|-------|------|--------|
| 1-15 | Basic implementation (v1.0.0) | ✅ Done |
| 16 | Design System integration | ✅ Done |
| 17 | UX Polish (Header, Grid, Gate Groups, Footer, Sorting, Tablet, Settings) | ✅ Done |
| 18 | Auto-load Gate Groups from Segments | ✅ Done |
| 19 | E2E Test Refactoring | ✅ Done |
| 20 | Bug fixes and UX feedback | ✅ Done |
| 21 | Schedule WebSocket issue | ✅ Done |
| 22 | Settings cleanup | ✅ Done |
| 23 | Grid layout and sticky columns | ✅ Done |
| 24 | Grid highlighting redesign | ✅ Done |
| 25 | WebSocket connection management | ✅ Done |
| 26 | Keyboard and scoring fixes | ✅ Done |
| 27 | Grid UX and keyboard improvements | ✅ Done |
| 28 | Grid layout fixes | ✅ Done |
| 29 | Code Review Cleanup | 🔄 In Progress |

**Current version:** v1.1.0

---

## Completed Milestones Summary

### v1.0.0 - Basic Implementation (Phases 1-15)

- Project setup: Vite + React + TypeScript + Design System
- WebSocket connection to c123-server
- Layout: Header, Footer, ConnectionStatus
- Race Selector with persistence
- Penalty Grid with keyboard navigation (arrows, 0/2/5/50, Delete)
- REST API scoring with optimistic updates
- Gate grouping with editor and shortcuts
- Protocol verification with progress bar
- Settings modal (server, display, keyboard shortcuts)
- Actions: DNS/DNF/CAP, manual timing
- Tests: Vitest + Playwright E2E + screenshots
- CI/CD: GitHub Actions

### v1.1.0 - Polish (Phases 16-28)

- Design System full integration (deleted ~1000 lines custom CSS)
- Header redesign with RaceBar component
- Grid: row/column highlighting, sticky columns, horizontal scroll
- Auto-load gate groups from track segments via `/api/xml/courses`
- Theme selector (Auto/Light/Dark)
- Keyboard: 50ms input (5→50), throttled navigation (60fps)
- WebSocket: single connection guard, Schedule on connect
- Tablet optimization (1024px/1366px breakpoints, 48px touch targets)

---

## Test Data

```bash
# Replay server (simulates live C123)
cd ../c123-protocol-docs/tools
node replay-server.js ../recordings/rec-2025-12-28T09-34-10.jsonl --speed 10 --loop

# c123-server
cd ../c123-server && npm start -- --host localhost --port 27333

# Penalty check app
npm run dev

# Screenshots
./scripts/take-screenshots.sh
```

---

## Phase 29: Code Review Cleanup

Deep code review (2 passes) revealed **40+ issues** across dead code, hooks, imports, and performance.
Estimated cleanup: **~1,800 lines** of dead code.

### 29A: Dead Code Removal - Components

- [x] **29A.1:** Delete unused components (~1,000 lines) ✓ -1,370 lines
  - `src/components/OnCourseGrid/` (entire folder - 385 TS + 304 CSS)
  - `src/components/TimingPanel/` (entire folder - 150 TS + 75 CSS)
  - `src/components/CompetitorActions/` (entire folder - 208 TS + 114 CSS)
  - `src/components/ConnectionStatus/` (entire folder - ~60 lines, replaced by Header)
  - Update `src/components/index.ts`

- [x] **29A.2:** Delete unused hooks (~80 lines) ✓ -82 lines
  - `src/hooks/useGateGroupShortcuts.ts`
  - Update `src/hooks/index.ts`

### 29A: Dead Code Removal - Types

- [x] **29A.3:** Remove unused types from `src/types/ui.ts` ✓ -128 lines
  - `ViewMode`, `FilterOptions`, `SelectionState`, `NavigationDirection`
  - `GridCellState`, `ModalState`, `ModalType`, `NotificationType`, `Notification`, `SortField`, `FocusPosition`, `SortDirection`

- [x] **29A.4:** Remove unused types from `src/types/scoring.ts` ✓ -126 lines
  - Functions: `parseGates()`, `isValidPenalty()`, `parseCheckedKey()`, `calculateTotalPenalty()`
  - Types: `ParsedCompetitor`, `GatePenalty`, `CompetitorState`, `GateInfo`, `ApiResponse`, `CheckedStateMap`

- [x] **29A.5:** Remove unused exports from `src/types/gateGroups.ts` ✓ -43 lines
  - Functions: `filterGatesByGroup()`, `groupsOverlap()`, `findOverlappingGates()`
  - Note: `CourseSegment`, `GateGroupsConfig`, `DEFAULT_GATE_GROUPS_CONFIG` are actually used

### 29A: Dead Code Removal - Utils

- [x] **29A.6:** Remove unused functions from `src/utils/gates.ts` ✓ -107 lines
  - `parseGatesString()`, `parseGatesWithConfig()`, `parseResultsGatesWithConfig()`
  - `calculateTotalPenalty()`, `calculateResultsTotalPenalty()`
  - `formatPenalty()`, `getPenaltyClass()`, `parseGateConfig()`
  - Types: `GateType`, `GatePenalty`
  - Updated tests to only test used function `parseResultsGatesString()`

- [x] **29A.7:** Delete unused file `src/utils/time.ts` ✓ -29 lines
  - `formatTimeAsSeconds()` (never called)

### 29B: Readability Improvements

- [x] **29B.1:** Extract magic numbers in `ResultsGrid.tsx` ✓
  - `SCROLL_PADDING = 4`, `SCROLLBAR_WIDTH = 14`, `SCROLL_BUFFER = 18`, `LONG_PRESS_DURATION = 500`

- [x] **29B.2:** Remove unreachable code in `ResultsGrid.tsx` ✓
  - Removed `isColFocus && isRowFocus` (crosshair) condition - logically impossible

- [x] **29B.3:** Simplify `App.tsx` empty state cascade ✓
  - Extracted 6-level ternary to `getViewState()` helper with typed `ViewState` union

### 29C: Performance Optimizations

- [x] **29C.1:** Memoize row penalties in `ResultsGrid.tsx` ✓
  - Parse once per row, not per cell (625 → ~25 parses for 25x25 grid)
  - Added `parsedPenaltiesMap: Map<bib, ParsedPenalties>` with useMemo

- [x] **29C.2:** Add memoized `PenaltyCell` component ✓
  - Extracted as `React.memo()` component with all logic inline
  - Receives pre-parsed penalties array instead of parsing per-cell

- [x] **29C.3:** Add debounce to `useSettings.ts` ✓
  - Added 300ms debounce to localStorage saves
  - Prevents thrashing on rapid setting changes

### 29D: Critical Fixes

- [x] **29D.1:** URL validation in `src/services/scoringApi.ts` ✓
  - Added `isValidHttpUrl()` helper with URL constructor validation
  - Falls back to default URL if localStorage contains invalid value

- [x] **29D.2:** Keep console.error/warn in production (`vite.config.ts`) ✓
  - Changed from `drop: ['console', 'debugger']` to `drop: ['debugger']`
  - Added `pure: ['console.log', 'console.debug', 'console.trace']`
  - Preserves console.error and console.warn for production debugging

### 29E: Accessibility

- [ ] **29E.1:** Add ARIA labels to grid cells in `ResultsGrid.tsx`
  - `aria-label`, `role="gridcell"`, proper `tabIndex`

### 29F: Hook Fixes (Critical)

- [ ] **29F.1:** Fix potential infinite loop in `useGateGroups.ts:178`
  - `loadCourses` callback in effect dependencies causes loop
  - Solution: stabilize callback or move outside effect

- [ ] **29F.2:** Fix stale position closures in `useFocusNavigation.ts:156-170`
  - `moveToRowStart`, `moveToRowEnd` capture stale `position`
  - Solution: use functional updates or refs

- [ ] **29F.3:** Fix event listener churn in `useFocusTrap.ts:117`
  - Effect re-runs on every render, adding/removing listeners
  - Solution: memoize `getFocusableElements`, reduce dependencies

- [ ] **29F.4:** Fix callback thrashing in `useScoring.ts:146`
  - Helper callbacks constantly recreated
  - Solution: stabilize internal function references

### 29G: Import/Export Cleanup

- [ ] **29G.1:** Add missing barrel export
  - Export `useCellInteraction` from `src/hooks/index.ts`
  - Fix deep import in `ResultsGrid.tsx:20`

- [ ] **29G.2:** Create `src/utils/index.ts` barrel file
  - Export all utility functions

- [ ] **29G.3:** Clean up service exports
  - Remove unused default exports from `scoringApi.ts`, `coursesApi.ts`
  - Simplify `src/services/index.ts`

- [ ] **29G.4:** Move `ws` to devDependencies in `package.json`
  - Only used in test mock server

### 29H: Test Infrastructure Review

- [ ] **29H.1:** Investigate failing `useC123WebSocket.test.ts` tests (16 failures)
  - Root cause: `MockWebSocket.getLastInstance()` returns `undefined`
  - WebSocket mock not being instantiated when expected
  - Symptoms: `Cannot read properties of undefined (reading 'simulateOpen')`

- [ ] **29H.2:** Analyze mock WebSocket implementation
  - Review `src/test/mockWebSocket.ts` architecture
  - Check if mock properly intercepts `new WebSocket()` calls
  - Verify timing issues (async connection vs sync test expectations)

- [ ] **29H.3:** Decide on test strategy
  - Option A: Fix mock to work with current hook implementation
  - Option B: Refactor hook to be more testable (dependency injection)
  - Option C: Replace unit tests with integration tests (real WebSocket to test server)
  - Option D: Remove flaky tests if they don't provide value

- [ ] **29H.4:** Implement chosen solution
  - Ensure all 21 WebSocket tests pass (currently 1 passes, 16 fail, 4 skipped)
  - Add CI gate to prevent future test regressions

### Verification

```bash
npm run build        # No errors
npx tsc --noEmit     # No type errors
npm run lint         # No unused warnings
npm test             # All pass
./scripts/take-screenshots.sh  # Screenshots match
```

### Impact

- **-1,800+ lines** of dead code removed
- **Cleaner imports** - proper barrel files, no deep imports
- **Better performance** - memoized grid cells, fixed hook loops
- **Improved security** - validated URLs
- **Better a11y** - screen reader support

---

## Future Ideas

- [ ] Test with real C123 hardware (scoring write verification)
- [ ] Tablet screenshots in tests (currently postponed)
- [ ] Performance profiling for large grids (30+ gates)

---

*Last updated: 2026-01-19 (Phase 29 - extended after 2nd review pass)*
