# C123-PENALTY-CHECK - Development Log

Development diary for the project. Records of what was done, what worked, what didn't.

---

## 2026-01-19 - Phase 29E: Accessibility

### Completed

- [x] **29E.1:** Add ARIA labels to grid cells in `ResultsGrid.tsx`

### Changes

Added comprehensive ARIA support to ResultsGrid for screen reader accessibility:

1. **Grid container**: `role="grid"` with `aria-label="Penalty grid"`
2. **PenaltyCell component**:
   - Added `role="gridcell"`
   - Added dynamic `aria-label` describing gate, bib, and penalty status
   - Added `tabIndex={isFocused ? 0 : -1}` for proper focus management
3. **Gate headers**: `role="columnheader"` with aria-label including reverse indicator
4. **Data rows**: `role="row"` for proper row semantics
5. **Bib cells**: `role="rowheader"` with aria-label

Example aria-label for cells: "Gate 5, Bib 10, clear" or "Gate 5, Bib 10, 50 seconds miss"

### Notes

- Build passes without errors
- WebSocket unit tests fail (16 failures) - pre-existing issue documented in PLAN.md Phase 29H
- Two lint warnings (also pre-existing in ResultsGrid useEffect dependencies)

---

## 2026-01-18 - Phase 20A-C: Bug fixes

### Completed

- [x] **20A.5-6:** Fix keyboard navigation - `pendingValue` is now reset on focus position change
- [x] **20B.1-2:** Sticky header - added `position: sticky; top: 0; z-index: 100` for header wrapper
- [x] **20C.1-2:** Space key for toggle "checked" - `event.preventDefault()` and callback to `onToggleChecked`

### Investigation 20A.1-2

Penalty writing (scoring) was investigated end-to-end:
- `c123-scoring/scoringApi.ts` → `POST /api/c123/scoring`
- `c123-server/UnifiedServer.ts` → handler `handleC123Scoring`
- `c123-server/ScoringService.ts` → XML formatting and `TcpSource.write()`

Code is implemented correctly. User-reported issue requires testing with real C123 hardware - could be TCP write problem or incorrect XML format.

### Changed Files

- `src/components/ResultsGrid/ResultsGrid.tsx` - added `useEffect` to reset `pendingValue`, added Space handler
- `src/components/Layout/Layout.module.css` - sticky header

---

## 2026-01-16 - Iteration 1

### Summary

First major implementation iteration. In one day, 11 out of 15 planned phases were implemented. Project is functional and usable for basic penalty entry workflow.

### Completed Phases

#### Phase 1: Project Setup
- Vite + React + TypeScript initialization
- Design system integration
- Directory structure
- **Commit:** `3048b1f feat: initial project setup with design system`

#### Phase 3: TypeScript Types and WebSocket
- Types for WebSocket messages (adapted from c123-scoreboard)
- Types for scoring API requests
- Types for UI state
- WebSocket hook with auto-reconnect
- Connection status hook
- **Commit:** `feat: add TypeScript types and WebSocket hook`

#### Phase 4: Layout and ConnectionStatus
- CSS Grid layout (header, main, footer)
- ConnectionStatus component with visual indicator
- Header component
- **Commit:** `e509b6c feat: add basic layout with connection status`

#### Phase 5: Race Selector
- useSchedule hook for parsing Schedule messages
- RaceSelector dropdown with status indicator
- Auto-select running race
- localStorage persistence
- **Commit:** `6c412d5 feat: add race selector with schedule integration`

#### Phase 6: Penalty Grid - Display
- OnCourseGrid component
- Utilities for parsing penalties and gate config
- Color coding for states (0=green, 2=orange, 50=red)
- Reverse gate highlighting
- **Commit:** `3c9f0f9 feat: add OnCourseGrid component for displaying competitors with penalties`

#### Phase 7: Keyboard Navigation
- useFocusNavigation hook (arrows, Home/End, PageUp/Down, Tab)
- useKeyboardInput hook (0/2/5 keys, Delete)
- GridCell component with focus styles and ARIA attributes
- **Commit:** `feat: add keyboard navigation to penalty grid`

#### Phase 8: REST API Integration
- scoringApi.ts service with retry logic
- useScoring hook with optimistic updates
- Toast notifications for feedback
- **Commits:**
  - `feat: add scoring API integration`
  - `feat: add Toast notification component`

#### Phase 9: Gate Grouping
- types/gateGroups.ts with overlap support
- useGateGroups hook with localStorage persistence
- GateGroupEditor component (visual editor)
- GateGroupSwitcher for quick switching
- Keyboard shortcuts 0-9 for groups
- **Commits:**
  - `65d4b2f feat: add gate groups types with overlap support`
  - `21ef96e feat: add useGateGroups hook for gate grouping`
  - `efcf188 feat: integrate gate grouping into penalty grid`
  - `682792e feat: add keyboard shortcuts for gate group switching`

#### Phase 10: Protocol Verification
- CheckedState types and utilities
- useCheckedState hook with localStorage persistence (per race, per group)
- Check column in grid
- CheckProgress component in footer
- **Commits:**
  - `0865549 feat: add protocol check tracking`
  - `c9e8f4d docs: update PLAN.md with completed phase 10 tasks`

#### Phase 11: Settings Panel
- Settings modal with three tabs (Server, Display, Keyboard)
- useSettings hook for centralized settings management
- Server URL validation and test connection
- Server history
- Keyboard shortcut Ctrl+,
- **Commit:** `eb4a036 feat: add settings panel with server configuration`

### Skipped/Postponed

- **Phase 0 (UI Design):** Skipped - implemented ad-hoc during development
- **Phase 2 (Test Infrastructure):** Postponed - priority was functional app

### What Worked Well

1. **Iterative approach** - gradual building from basics to complex features
2. **Copying types from c123-scoreboard** - saved time and ensured compatibility
3. **Design system** - consistent styling without writing everything from scratch
4. **localStorage persistence** - simple implementation, works reliably

### What Didn't Work / Problems

1. **Documentation wasn't updated continuously** - PLAN.md checkboxes weren't marked, DEVLOG.md didn't exist
2. **Some components implemented differently than planned** - e.g., OnCourseGrid instead of PenaltyGrid, KeyboardHelp as part of Settings

### Architecture Notes

- Decision: OnCourseGrid contains most logic instead of splitting into multiple components
- Decision: Gate groups are scoped per raceId in localStorage
- Decision: Checked state is scoped per race AND per gate group

### Next Steps

See PLAN.md - remaining phases 12-15:
- Phase 12: RemoveFromCourse and Timing (DNS/DNF/CAP actions)
- Phase 13: Polish and UX improvements
- Phase 14: Visual tests (Playwright)
- Phase 15: Documentation and finalization

---

## 2026-01-16 - Documentation Fix

### Goal

Fix missing documentation and update test plan.

### Completed

- [x] Fixed checkboxes in PLAN.md (phases 1-11 marked as done)
- [x] Created DEVLOG.md with iteration 1 summary
- [x] Extended CLAUDE.md with explicit documentation process
- [x] Rewrote Phase 2 (Test Infrastructure) with distinction:
  - **Captures** = static XML (works now)
  - **Recordings** = JSONL recordings (requires ReplaySource in c123-server)
- [x] Updated "Test Data" section with instructions for both modes

### Notes

**Finding:** c123-server doesn't support recording playback - only has:
- `TcpSource` - connection to live C123
- `XmlFileSource` - static XML files

**Solution:** Create standalone `replay-server.js` in c123-protocol-docs/tools:
- TCP server on port 27333 (emulates C123)
- c123-server connects to it like authentic C123
- No changes to c123-server needed

```
replay-server (TCP:27333) → c123-server → c123-scoring
```

**Important rule:** From this project DO NOT MODIFY other projects (c123-server, c123-protocol-docs, etc.) - only read as reference. Implement replay-server separately in c123-protocol-docs.

---

## 2026-01-16 - Phase 2A: Replay Server

### Iteration Goal

Implement replay-server for playing back JSONL recordings as live C123 simulation.

### Completed

- [x] Created `c123-protocol-docs/tools/replay-server.js`
  - TCP server on port 27333
  - JSONL parsing, filtering `src: "tcp"` messages
  - Playback respecting timestamps
  - CLI parameters: --speed, --loop, --port
- [x] Tested with c123-server and c123-scoring
- [x] Updated `recordings/README.md` with documentation
- [x] Screenshot of working app: `docs/screenshots/scoring-live-replay.png`

### Architecture

```
replay-server (TCP:27333) → c123-server (:27123) → c123-scoring (:5173)
```

### Notes

- Replay-server filters only `src: "tcp"` messages (C123 protocol)
- Uses `|` delimiter like authentic C123
- Recording `rec-2025-12-28T09-34-10.jsonl` contains 1051 TCP messages (4m 7s)
- With `--speed 5` the 4 minutes play back in ~50s

---

## 2026-01-16 - Phase 13.0: Grid Display Fix

### Iteration Goal

Fix grid to primarily show finished competitors (for penalty verification), not competitors on course.

### Completed

- [x] Split competitors into "finished" and "on-course"
- [x] Finished sorted by `rank` (position), not by `position`
- [x] Competitors on course sorted by `position` (1 = closest to finish)
- [x] Finished competitors are primary at top, on course are secondary section
- [x] Visual separator "ON COURSE (X)" between sections
- [x] Column "#" shows rank for finished, position for on course
- [x] CSS adjustments - finished have full opacity, on course have reduced (0.85)

### Changes

**OnCourseGrid.tsx:**
- New logic for separating and sorting competitors
- Fragment wrapper for section separator insertion
- Dynamic rank vs position display

**OnCourseGrid.css:**
- New styles for `.section-separator` and `.section-label`
- Inverted opacity - now finished are fully visible, on course dimmed

### Notes

- Toggle for hiding on-course competitors (13.0.4) postponed - not critical
- Keyboard navigation works across both sections (row index is consistent)

---

## 2026-01-16 - Phase 13.2: Error Boundaries

### Iteration Goal

Add ErrorBoundary component for catching React errors and showing fallback UI.

### Completed

- [x] Created `ErrorBoundary` component (class component with getDerivedStateFromError)
- [x] Fallback UI with error details, "Try Again" and "Reload Page" buttons
- [x] CSS styles consistent with design system
- [x] Integration in main.tsx (wraps ToastProvider and App)

### Notes

- ErrorBoundary must be class component (React hooks don't support error boundaries)
- Wraps entire app including ToastProvider for maximum protection

---

## 2026-01-16 - Phase 13.3: Empty States

### Iteration Goal

Add EmptyState components for various empty application states.

### Completed

- [x] Created EmptyState component with variants:
  - `disconnected` - no server connection
  - `no-races` - no active races
  - `no-competitors` - no competitors in selected race
  - `loading` - connecting in progress
- [x] Each variant has icon, title and message
- [x] Disconnected state has action button to open settings
- [x] Integration in App.tsx with cascading display logic

### Notes

- States are hierarchically ordered: loading → disconnected → no-races → no-competitors → grid
- Icons are emoji for simplicity (no icon library dependencies)
- CSS animation for loading state (pulse effect)

---

## 2026-01-16 - Phase 13.4: Animations and Transitions

### Iteration Goal

Add animations and transitions for better UX, respecting `prefers-reduced-motion`.

### Completed

- [x] Modal animations (fade-in overlay, scale-in content) in App.css
- [x] Connection status indicator - pulsing animation for connecting state
- [x] Penalty cell transitions - smooth transitions between states (empty/clear/touch/miss)
- [x] Competitor row transitions - smooth hover and state changes
- [x] `@media (prefers-reduced-motion: reduce)` in all relevant CSS files:
  - App.css
  - ConnectionStatus.module.css
  - OnCourseGrid.css
  - EmptyState.css
  - Settings.module.css
  - Toast.css (already existed)

### Changes

**App.css:**
- Added `fade-in` animation for modal overlay
- Added `modal-scale-in` animation for modal content
- Reduced-motion section for disabling animations

**ConnectionStatus.module.css:**
- Added `indicator--connecting` class with pulse animation
- Transition for indicator on state change

**useConnectionStatus.ts:**
- Added new statusClass `'connecting'` for animated state

**OnCourseGrid.css:**
- Transitions for penalty states and competitor rows
- Reduced-motion section

### Notes

- All animations are short (150-200ms) for responsive feel
- Reduced-motion users see static states without animations
- Toast.css already had reduced-motion support from previous iteration

---

## 2026-01-16 - Phase 13.5: Focus Trap in Modals

### Iteration Goal

Add focus trap to all modals for better keyboard navigation and accessibility.

### Completed

- [x] Created `useFocusTrap` hook
  - Automatic focus on first focusable element when opened
  - Focus cycling between first and last element on Tab/Shift+Tab
  - Focus restoration to previous element when modal closes
  - Support for enabled/autoFocus/restoreFocus options
- [x] Integrated into Settings modal
- [x] Integrated into GateGroupEditor modal
- [x] Export from hooks/index.ts

### Notes

- Hook uses `requestAnimationFrame` for proper focus timing
- Focusable elements detected via standard selector (a, button, input, select, textarea, [tabindex])
- Elements with `display: none` or `visibility: hidden` are filtered

---

## 2026-01-16 - Phase 13.8: Touch Device Optimization

### Iteration Goal

Ensure all interactive elements have minimum 44×44px touch target on touch devices.

### Completed

- [x] OnCourseGrid.css - gate cells (44px), check buttons (44px), row heights (48px)
- [x] RaceSelector.module.css - select height (44px), larger padding
- [x] GateGroupSwitcher.module.css - group buttons (44px), edit button (44px)
- [x] Settings.module.css - tabs, buttons, inputs, checkboxes
- [x] CompetitorActions.module.css - action buttons (44px), menu sizing
- [x] GateGroupEditor.module.css - all interactive elements including gates grid
- [x] TimingPanel.module.css - timing buttons (48px), confirm buttons

### Implementation

Used `@media (pointer: coarse)` media query for touch device detection:
- Increased touch targets to min 44×44px (WCAG recommendation)
- Input font-size 16px to prevent zoom on iOS
- Larger padding for comfortable control

### Notes

- `pointer: coarse` is more reliable than `hover: none` for touch device detection
- Timing buttons have 48px for better ergonomics (critical actions)
- iOS automatically zooms when focusing input with font-size < 16px

---

## 2026-01-16 - Phase 13.10: Bundle Size Optimization

### Iteration Goal

Analyze and optimize production bundle size.

### Completed

- [x] Bundle analysis with rollup-plugin-visualizer
- [x] Proper vendor chunk splitting (React/ReactDOM)
- [x] Vite configuration for optimal build:
  - Target ES2020 (modern JS without polyfills)
  - Drop console/debugger in production
  - Remove legal comments

### Results

**Before optimization:**
- Total: 479 kB (136 kB gzip)
- Everything in one bundle

**After optimization:**
- Vendor (React): 330 kB (100.5 kB gzip) - cacheable
- App code: 88.5 kB (19.7 kB gzip)
- Total: 418 kB (120.2 kB gzip) - **12% smaller**

### Notes

- React 19 has larger runtime than React 18 (~330kB vs ~140kB)
- Vendor chunk is separated for better caching - React doesn't change often
- App code 88.5 kB is reasonable for app with 3300 lines of TypeScript
- source-map-explorer and rollup-plugin-visualizer added as dev dependencies

---

## 2026-01-16 - Phase 14: Visual Tests (Playwright)

### Iteration Goal

Implement Playwright tests and create screenshots of all app states for documentation.

### Completed

- [x] Playwright installation and dependencies (@playwright/test, ws, tsx)
- [x] playwright.config.ts configuration
- [x] Mock WebSocket server for tests (tests/mock-ws-server.ts)
- [x] Test fixtures (tests/fixtures/mock-data.ts)
- [x] Playwright tests for static states (screenshots-static.spec.ts)
- [x] Playwright tests for states with data (screenshots-with-data.spec.ts)
- [x] 15 documentation screenshots in docs/screenshots/

### Created Screenshots

| File | Description |
|------|-------------|
| 01-disconnected.png | Disconnected state |
| 02-connecting.png | Connecting |
| 03-settings-panel.png | Settings modal - Server tab |
| 04-settings-keyboard.png | Settings modal - Keyboard tab |
| 05-no-races.png | Connected, no races |
| 07-race-selector.png | Race selector with multiple races |
| 08-grid-finished.png | Grid with competitors |
| 09-grid-cell-focus.png | Grid with cell focus |
| 10-grid-oncourse-section.png | Grid - On Course section |
| 11-gate-group-switcher.png | Gate group switcher |
| 12-gate-group-editor.png | Gate group editor modal |
| 13-competitor-actions.png | Competitor actions menu |
| 14-check-progress.png | Check progress in footer |
| 15-mobile-view.png | Mobile view |
| 16-mobile-settings.png | Mobile settings |

### Problems and Solutions

1. **Problem:** Mock WebSocket server conflicted with port during parallel tests
   **Solution:** Split tests into two files - static (no server) and with data (require running c123-server + replay-server)

2. **Problem:** Check buttons are disabled for on-course competitors
   **Solution:** Test 14 updated to skip disabled buttons

### Notes

- Tests with data require running replay-server + c123-server
- Static tests can run standalone: `npm run test -- screenshots-static.spec.ts`
- Screenshot 06-no-competitors.png missing (difficult to create specific state)

---

## 2026-01-16 - Results-based Grid Refactoring

### Iteration Goal

Refactor main grid from OnCourse data to Results data for proper penalty verification. OnCourse data is suitable for live competitor tracking, but Results contains complete race results.

### Completed

- [x] Added utility functions for parsing Results gates format (spaces instead of commas)
  - `parseResultsGatesString()` in utils/gates.ts
  - `parseResultsGatesWithConfig()` in utils/gates.ts
- [x] Created new component `ResultsGrid`
  - Uses Results data instead of OnCourse
  - Sorts competitors: valid results by rank, DNS/DNF/DSQ at end
  - Shows status (DNS/DNF/DSQ) in # column
  - Shares CSS styles with OnCourseGrid
- [x] App.tsx updated to use Results data
  - ResultsGrid replaces OnCourseGrid as main grid
  - finishedCompetitorBibs now calculated from Results

### File Changes

- `src/utils/gates.ts` - new functions for Results format
- `src/components/ResultsGrid/` - new component
- `src/components/index.ts` - export ResultsGrid
- `src/App.tsx` - use ResultsGrid instead of OnCourseGrid

### Notes

- OnCourseGrid remains in codebase for potential use as supplementary panel
- Results data has gates separated by spaces ("0 0 2 0 50"), OnCourse by commas ("0,0,2,0,50")
- Still need to update Race selector to shortTitle

---

## 2026-01-17 - Gates Parsing Fix + Screenshots

### Iteration Goal

Fix penalty display in grid (were "every other column") and update screenshots for documentation.

### Completed

- [x] **Bug fix: parseResultsGatesString** - C123 Results data has double spaces between values (`"0  0  0  2  0  ..."` instead of `"0 0 0 2 0 ..."`). Parser now uses regex `/\s+/` for split.
- [x] Added unit test for double spaces in gates string
- [x] Updated all screenshots (07-15) with real Results data
- [x] Improved E2E tests:
  - `waitForDataAndSelectRace()` helper function
  - Automatic selection of K1m 2nd run (has data in replay)
  - Clearing localStorage for consistent results
- [x] Fixed mock-ws-server to send Results messages
- [x] Fixed mock-data.ts with correct message types (Connected, Results)

### Commits

- `7772537` fix: parse Results gates string with multiple spaces
- `877e1cc` test: update screenshots and improve E2E test reliability

### Problems and Solutions

1. **Problem:** Penalties displayed "every other column" (gate 5 in column 9, etc.)
   **Solution:** Gates string from C123 has double spaces. Split by ` ` created empty items. Fixed with `/\s+/` regex.

2. **Problem:** Screenshots showed "No competitors" - data didn't arrive
   **Solution:**
   - Select correct race (K1m 2nd run has Results data)
   - Longer wait for data loading
   - Clear localStorage before test

3. **Problem:** Mock server sent ServerInfo instead of Connected, missing Results
   **Solution:** Fixed message types in mock-data.ts, added Results sending in mock-ws-server.ts

### Notes

- C123 sends gates in format `"0  0  0  2  ..."` with double spaces
- Results messages aren't sent regularly (only on change), so screenshots depend on correct replay-server timing
- Screenshots show stable state from K1m - medium course - 2nd run

---

## 2026-01-17 - Phase 15.5: GitHub Actions Workflow

### Iteration Goal

Add CI/CD pipeline for automatic building and testing on push/PR.

### Completed

- [x] Created `.github/workflows/ci.yml`
  - Build job: checkout both repos, lint, typecheck, unit tests, build
  - E2E job: Playwright tests (static screenshots)
  - Upload artifacts for build and test reports
- [x] Solution for local timing-design-system dependency:
  - CI checks out both repositories
  - Dynamically changes path in package.json

### Notes

- E2E tests run only `screenshots-static.spec.ts` (don't require mock server)
- Full E2E suite requires replay-server, which is outside CI scope

---

## 2026-01-17 - Phase 16C: Settings Modal Redesign

### Iteration Goal

Refactor Settings component to use design system components instead of custom CSS styles.

### Completed

- [x] Replaced custom modal with DS `Modal`, `ModalHeader`, `ModalTitle`, `ModalClose`, `ModalBody`
- [x] Used DS `Tabs`, `TabList`, `Tab`, `TabPanels`, `TabPanel` for tab switching
- [x] Used DS `Input` for server URL input
- [x] Used DS `Checkbox` for display options
- [x] Used DS `Button` for actions (Test Connection, Save & Reconnect)
- [x] Used DS `Kbd` for keyboard shortcut display
- [x] Used DS `Badge` for connection status
- [x] Deleted Settings.module.css (387 lines)
- [x] Created minimal Settings.css (130 lines) for layout-specific styles

### File Changes

- `src/components/Settings/Settings.tsx` - complete refactor to DS components
- `src/components/Settings/Settings.css` - new minimal CSS file
- `src/components/Settings/Settings.module.css` - deleted

### Notes

- DS Modal has its own focus trap, so useFocusTrap hook no longer needed
- Badge component nicely replaces custom status indicators
- Overall saved ~260 lines of CSS code

---

## 2026-01-17 - Phase 16D: Grid Redesign

### Iteration Goal

Refactor ResultsGrid to use design system Table components and create PenaltyCell component with DS tokens.

### Completed

- [x] Used DS `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`, `TableHeaderCell`
- [x] Created `PenaltyCell` component as custom cell with DS tokens
- [x] Used DS `Badge` for DNS/DNF/DSQ status display
- [x] New `ResultsGrid.css` with DS color tokens for penalty states
- [x] Color coding: clear (success), touch (warning), miss (error)
- [x] Preserved keyboard navigation and focus management

### File Changes

- `src/components/ResultsGrid/ResultsGrid.tsx` - rewritten to DS Table components
- `src/components/ResultsGrid/PenaltyCell.tsx` - new component for penalty cells
- `src/components/ResultsGrid/ResultsGrid.css` - new styles with DS tokens
- `src/components/ResultsGrid/index.ts` - export PenaltyCell

### Notes

- DS Checkbox not used for check button - custom implementation fits better in compact grid
- OnCourseGrid.css kept for reference, ResultsGrid has its own CSS
- Transition to DS Table simplifies styling and ensures consistency with other timing projects

---

## 2026-01-17 - Phase 17A: Header Redesign

### Iteration Goal

Header redesign following c123-server admin pattern - cleaner layout with prominent race selector.

### Completed

- [x] Explore c123-server admin for inspiration (event-bar pattern)
- [x] Simplify Header component:
  - Only HeaderBrand ("C123 Scoring") + HeaderStatus + settings button
  - Removed subtitle/raceInfo from header
- [x] Create new RaceBar component:
  - Prominent h1 with selected race name
  - Select size="lg" for large race selector
  - LIVE/Finished badge at race selector
- [x] Update Layout for race bar slot support
- [x] Sticky footer (position: sticky, bottom: 0)
- [x] Change ⚙ icon at gate groups to ✎ (edit) - differentiation from settings

### File Changes

- `src/components/Header/Header.tsx` - simplified, removed raceInfo prop
- `src/components/RaceBar/` - new component (RaceBar.tsx, RaceBar.css, index.ts)
- `src/components/Layout/Layout.tsx` - added raceBar slot
- `src/components/Layout/Layout.module.css` - grid-template-rows: auto auto 1fr auto, sticky footer
- `src/components/GateGroupSwitcher/GateGroupSwitcher.tsx` - icon change ⚙ → ✎
- `src/App.tsx` - use new RaceBar instead of RaceSelector in header
- `src/components/index.ts` - export RaceBar

### Notes

- Pattern from c123-server admin: header has only brand + status indicators, event info is in separate "event-bar"
- RaceBar shows always, even when no race selected ("No race selected")
- Footer is now sticky - always visible at bottom of screen

---

## 2026-01-17 - Phase 17B: Grid UX Improvements

### Iteration Goal

Add visual row and column highlighting during grid navigation for better orientation.

### Completed

- [x] Column highlight on HOVER (subtle 30% accent)
- [x] Column highlight on FOCUS (more prominent 50% accent)
- [x] Row highlight on FOCUS
- [x] Gate header cells highlighted for hovered/focused columns
- [x] Removed club from name column (less clutter)
- [x] PenaltyCell extended with isColumnHovered/isColumnFocused props

### File Changes

- `src/components/ResultsGrid/ResultsGrid.tsx` - hover state, focus highlighting
- `src/components/ResultsGrid/ResultsGrid.css` - CSS classes for highlight
- `src/components/ResultsGrid/PenaltyCell.tsx` - new props for column highlighting

### Notes

- Used `color-mix()` CSS function for transparent overlay effects
- Hover column is subtler (30%) than focus column (50%)
- Focus row has same intensity as focus column

---

## 2026-01-17 - Phase 17C: Gate Groups Visibility

### Iteration Goal

Improve gate groups visibility - move switcher to more prominent place and visually mark active group.

### Completed

- [x] Added `toolbar` slot to Layout component
- [x] GateGroupSwitcher moved from footer to toolbar above grid
- [x] Added label with active group name and gate count
- [x] Removed `compact` mode (no longer needed)
- [x] Added visual indication of active group in grid:
  - `gate-header--in-group` class for header cells
  - `penalty-cell--in-group` class for penalty cells
  - Accent color as `box-shadow: inset 0 3px 0` on top of columns
- [x] PenaltyCell extended with `isInActiveGroup` prop

### File Changes

- `src/components/Layout/Layout.tsx` - added toolbar slot
- `src/components/Layout/Layout.module.css` - grid-template-rows: auto auto auto 1fr auto
- `src/components/GateGroupSwitcher/GateGroupSwitcher.tsx` - new design with label
- `src/components/GateGroupSwitcher/GateGroupSwitcher.module.css` - reworked styles
- `src/components/ResultsGrid/ResultsGrid.tsx` - isInActiveGroup prop
- `src/components/ResultsGrid/ResultsGrid.css` - styles for in-group indication
- `src/components/ResultsGrid/PenaltyCell.tsx` - new prop
- `src/App.tsx` - moved GateGroupSwitcher to toolbar slot

### Notes

- E2E screenshot tests are outdated (use old selectors like `.gate-cell`, `.competitor-row`)
- Visual verification done manually via build
- Footer is now simpler - contains only version and check progress

---

## 2026-01-17 - Phase 17D-E: Sticky Footer + Competitor Sorting

### Iteration Goal

Complete sticky footer (17D) and add competitor sorting option (17E).

### Completed

- [x] 17D: Footer sticky - already implemented as part of 17A (position: sticky, bottom: 0)
- [x] 17E.1: Type `ResultsSortOption` and `RESULTS_SORT_LABELS` in types/ui.ts
- [x] 17E.2: `SortSelector` component with DS Select
- [x] 17E.3: Sorting logic in `ResultsGrid.tsx` (new prop `sortBy`)
- [x] 17E.4: localStorage persistence in App.tsx
- [x] 17E.5: Toolbar layout with GateGroupSwitcher and SortSelector

### File Changes

- `src/types/ui.ts` - new types for sort
- `src/components/SortSelector/` - new component (SortSelector.tsx, SortSelector.css, index.ts)
- `src/components/index.ts` - export SortSelector
- `src/components/ResultsGrid/ResultsGrid.tsx` - sortBy prop and sorting logic
- `src/App.tsx` - sort state, handler, toolbar layout
- `src/styles/app.css` - .toolbar-content styles

### Notes

- Phase 17D was already done from 17A - only marked in PLAN.md
- Sort options: startOrder, rank (default), bib
- DNS/DNF/DSQ competitors are always at end, sorted by startOrder
- Toolbar now contains GateGroupSwitcher on left and SortSelector on right

---

## 2026-01-17 - Phase 17F: Tablet Optimization

### Iteration Goal

Add tablet breakpoints and increase touch targets to 48px for better ergonomics on touch devices.

### Completed

- [x] Added tablet breakpoints:
  - 1366px: iPad Pro landscape, Surface Pro landscape
  - 1024px: iPad landscape, Surface Pro portrait
  - 768px: iPad portrait (already existed)
- [x] Touch targets increased from 44px to 48px:
  - Global min-height in app.css
  - Penalty cells in ResultsGrid
  - Check buttons in ResultsGrid
  - Group buttons in GateGroupSwitcher
  - History items in Settings
- [x] Tablet-specific adjustments:
  - Smaller padding at 1024px and 1366px
  - Smaller font-size for labels at 1024px
  - Race bar title reduced on tablet

### File Changes

- `src/styles/app.css` - global tablet breakpoints and touch targets 48px
- `src/components/Layout/Layout.module.css` - tablet padding
- `src/components/ResultsGrid/ResultsGrid.css` - tablet breakpoints, touch 48px
- `src/components/RaceBar/RaceBar.css` - tablet breakpoints
- `src/components/GateGroupSwitcher/GateGroupSwitcher.module.css` - tablet breakpoints, touch 48px
- `src/components/Settings/Settings.css` - touch 48px

### Notes

- App is designed for large tablets (iPad Pro, Surface Pro), not for mobile
- 48px touch targets are better than 44px for ergonomics (easier to hit with finger)
- Tablet screenshots postponed - E2E tests are outdated and need refactoring

---

## 2026-01-17 - Phase 17G: Screenshot Cleanup

### Iteration Goal

Clean up screenshot folder - delete outdated and mobile screenshots.

### Completed

- [x] Deleted `scoring-live-replay.png` - old screenshot before redesign
- [x] Deleted mobile screenshots `15-mobile-view.png` and `16-mobile-settings.png`
- [x] Updated PLAN.md

### Notes

- Tablet screenshots (17G.3) postponed - E2E tests are outdated (use old selectors)
- 15 screenshots remain documenting current app state
- App is optimized for tablet, not for mobile

---

## 2026-01-17 - Phase 17H: Settings Consolidation

### Iteration Goal

Audit and consolidate settings icons - solving "3× gear icon" problem.

### Completed

- [x] 17H.1: Audit settings icons across entire app
- [x] 17H.2: Verified single entry: header ⚙ + Ctrl+,
- [x] 17H.3: Confirmed footer and grid have no settings icons
- [x] 17H.4: Updated PLAN.md

### Audit Results

| Location | Icon | Action | Status |
|----------|------|--------|--------|
| Header | ⚙ | Opens Settings modal | ✅ Correct |
| Ctrl+, | - | Opens Settings modal | ✅ Correct |
| GateGroupSwitcher | ✎ | Opens GateGroupEditor | ✅ Different icon |
| EmptyState (disconnected) | - | "Open Settings" button | ✅ Contextual |
| Settings > Display | - | "Edit Gate Groups" button | ✅ Text |
| Footer | - | No settings icon | ✅ Clean |

### Notes

- "3× gear icon" problem was already solved in previous phases
- Phase 17A changed gate groups icon from ⚙ to ✎ (edit)
- Footer contains only version and check progress, no settings
- Current state is clean and consistent

---

## 2026-01-17 - Header Redesign + Gate Group Indicators

### Iteration Goal

Header redesign from 3 bars (~250px) to one compact row (~44px) and move gate group indicators to grid.

### Iteration 1: New Header ✅

- [x] Created `RaceSelector` component with arrows and dropdown selector
- [x] Rewrote `Header` component to compact DS header
- [x] Simplified `Layout` - removed `raceBar` and `toolbar` props
- [x] Updated `App.tsx` with new props

### Iteration 2: Gate Group Indicators ✅

- [x] Created `GateGroupIndicatorRow` component in ResultsGrid
- [x] Integrated into ResultsGrid as row above gate numbers
- [x] Added dimming styles for inactive gate groups
- [x] PenaltyCell extended with `isDimmed` prop

### Iteration 3: Start Time Column ✅

- [x] Added `showStartTime` to useSettings
- [x] Added toggle in Settings modal (Display tab)
- [x] Added Start Time column to ResultsGrid (conditional)
- [x] Note: Finish time not implemented - C123ResultRow doesn't have finishTime field

### Iteration 4: Cleanup ✅

- [x] Deleted folders `src/components/RaceBar/` and `src/components/GateGroupSwitcher/`
- [x] Updated exports in `src/components/index.ts`
- [x] Removed unused `.toolbar-content` styles from app.css
- [x] Build verification

### Deleted Files

```
src/components/RaceBar/         (entire folder)
src/components/GateGroupSwitcher/  (entire folder)
```

### Notes

- Header is now one compact bar (~44px) instead of 3 bars (~250px)
- Gate groups are now visualized as colored bars above gate columns in grid
- Click on group activates dimming of other columns
- Start time column is optional (Settings > Display)

---

## 2026-01-18 - Phase 18 Analysis (BLOCKED)

### Iteration Goal

Implement automatic gate groups loading from track segments (phase 18 from PLAN.md).

### Findings

Phase 18 is **blocked** - requires changes in c123-server, which conflicts with rule in CLAUDE.md.

**Problem Analysis:**

1. **XML data contains segment info:**
   - `CourseData.CourseConfig: "NNRNSNNRNSRNNNSRNNNSRRNS"` where `S` = split boundary
   - Documented in `c123-protocol-docs/c123-xml-format.md`

2. **c123-server doesn't parse CourseData:**
   - `XmlDataService.ts` parses only `Participants`, `Schedule`, `Results`
   - `CourseData` element is ignored
   - REST API doesn't have endpoint `/api/xml/courses`

3. **TCP stream doesn't have segment info:**
   - `RaceConfig` message has `gateConfig: "NNRNNRNRNNNRNNRNRNNRNNRN"` (without S)
   - `nrSplits` tells split count, but not their positions

4. **c123-scoring is ready:**
   - Types `CourseSegment`, `createGroupsFromSegments()` exist
   - `useGateGroups` hook has placeholder `parseSegmentsFromConfig()` returning `[]`

**Conclusion:** Without c123-server change, segment data cannot be obtained.

### Completed

- [x] Analysis of data structure in c123-server
- [x] Analysis of XML format in c123-protocol-docs
- [x] Updated PLAN.md:
  - Phase 18 marked as BLOCKED
  - Added explicit dependency on c123-server changes
  - Created Phase 19 (E2E test refactoring) as alternative

### Notes

**To unblock phase 18:**
1. Approval of c123-server changes (exception from CLAUDE.md rule)
2. Implementation in c123-server:
   - Parse `CourseData` in `XmlDataService.ts`
   - REST endpoint `GET /api/xml/courses`
3. Then implementation in c123-scoring

**Alternative:** Skip to phase 19 (E2E tests) which is independent.

---

## 2026-01-18 - Phase 19: E2E Test Refactoring

### Iteration Goal

Update E2E tests after UI redesign - fix outdated selectors and regenerate screenshots.

### Completed

- [x] **screenshots-static.spec.ts:**
  - Fixed selectors for Settings modal (used data-testid attributes)
  - Removed mobile test (16-mobile-settings) - app targets tablets
  - Added test for Display tab (05-settings-display)

- [x] **screenshots-with-data.spec.ts:**
  - Fixed selector for race selector: `.race-selector select` → `select[aria-label="Select race"]`
  - Removed non-existent selector `.competitor-row` → used `.results-grid tbody tr`
  - Renamed screenshots for better description:
    - `10-grid-oncourse-section` → `10-gate-group-active`
    - `11-gate-group-switcher` → `11-gate-group-indicators`
    - `12-gate-group-editor` → `12-settings-display`
  - Reordered tests (dark mode before tablet tests)

- [x] **Screenshot regeneration:**
  - Ran `./scripts/take-screenshots.sh`
  - 16 tests passed (5 static + 11 with data)
  - 17 screenshots generated
  - Deleted old screenshots with incorrect names

### Generated Screenshots

| # | Name | Description |
|---|------|-------------|
| 01 | disconnected | Disconnected state |
| 02 | connecting | Connecting to server |
| 03 | settings-panel | Settings modal - Server tab |
| 04 | settings-keyboard | Settings modal - Keyboard shortcuts |
| 05 | settings-display | Settings modal - Display options |
| 07 | race-selector | Header with race selector |
| 08 | grid-finished | Grid with competitors |
| 09 | grid-cell-focus | Grid with cell focus |
| 10 | gate-group-active | Activated gate group with dimming effect |
| 11 | gate-group-indicators | Gate group indicators in grid |
| 12 | settings-display | Settings Display tab with data |
| 13 | competitor-actions | Context menu for competitor |
| 14 | check-progress | Footer with check progress |
| 17 | dark-mode | Dark mode |
| 18 | tablet-landscape | iPad Pro landscape |
| 19 | tablet-portrait | iPad Pro portrait |

### Notes

- Screenshot 06 (no-competitors) missing - difficult to create specific state
- Screenshots 15-16 (mobile) removed - app targets tablets
- RaceSelector uses DS Select components, not custom CSS classes
- Settings modal has data-testid attributes for reliable testing

---

## 2026-01-18 - Phase 18B: Auto-load Gate Groups

### Iteration Goal

Implement automatic gate groups loading from track segments from REST API `/api/xml/courses`.

### Completed

- [x] **API client:** New `src/services/coursesApi.ts` for fetch `/api/xml/courses`
- [x] **Helper function:** `createSegmentsFromSplits()` in `src/types/gateGroups.ts`
- [x] **Hook update:** `useGateGroups` now:
  - Fetches courses from REST API on connection
  - Creates segment groups from splits data
  - Exports `availableCourses`, `coursesLoading`, `reloadCourses`
- [x] **Segment colors:** Added `SEGMENT_COLORS` palette for visual differentiation
- [x] **UI integration:** Segment groups automatically show in `GateGroupIndicatorRow`

### File Changes

- `src/services/coursesApi.ts` - new API client
- `src/services/index.ts` - export coursesApi
- `src/types/gateGroups.ts` - `createSegmentsFromSplits()`, `SEGMENT_COLORS`
- `src/hooks/useGateGroups.ts` - fetch courses, new return values

### Architecture

```
c123-scoring                     c123-server
     │                                │
     │ GET /api/xml/courses          │
     ├───────────────────────────────>│
     │                                │
     │ { courses: [                   │
     │   { courseNr: 1,               │
     │     splits: [5, 9, 14, ...] }  │
     │ ]}                             │
     │<───────────────────────────────┤
     │                                │
     ▼
createSegmentsFromSplits([5, 9, 14], 24)
     │
     ▼
[Segment 1 (1-5), Segment 2 (6-9), Segment 3 (10-14), ...]
```

### Notes

- Segment groups show automatically in grid above gate headers
- Click on segment activates dimming of other columns (same as custom groups)
- Replay server doesn't have CourseData, segments only show with real C123/XML
- Phase 18C (verification) requires testing with real XML

---

## 2026-01-18 - Phase 20F: Grid Highlighting Redesign

### Iteration Goal

Change grid highlighting from background coloring to border, for better readability.

### Completed

- [x] Row focus: horizontal borders (top/bottom) on all cells in row
- [x] Column focus: vertical borders (left/right) on all cells in column
- [x] Focused cell: full 2px accent border
- [x] Hover: subtle 1px muted border
- [x] Crosshair effect: combined row+column borders at cell intersections
- [x] Changed `--in-group` from box-shadow to border-top (to avoid conflicts)

### Changed Files

- `src/components/ResultsGrid/ResultsGrid.css` - new border-based highlight styles

### Notes

- Original background highlighting used `color-mix()` for transparent overlay
- Box-shadows override each other, so style combinations required explicit CSS rules
- `--in-group` changed to `border-top` instead of `box-shadow` to work together with row/column highlights

---

## 2026-01-18 - Phase 20G: Theme Toggle

### Iteration Goal

Add option to explicitly switch between light/dark mode in Settings.

### Completed

- [x] Added type `ThemeMode = 'auto' | 'light' | 'dark'` to `useSettings.ts`
- [x] Added `theme` field to `Settings` interface with default 'auto'
- [x] Theme selector in Settings modal (Display tab) using DS Select component
- [x] `useEffect` in `App.tsx` applies `.theme-light` / `.theme-dark` classes to `document.documentElement`
- [x] Auto mode doesn't apply any class - DS uses `@media (prefers-color-scheme: dark)`

### Changed Files

- `src/hooks/useSettings.ts` - new type and `theme` field
- `src/components/Settings/Settings.tsx` - theme selector in Display tab
- `src/App.tsx` - useEffect for applying theme classes

### Notes

- Design system (`timing-design-system`) uses CSS classes `.theme-light` and `.theme-dark` on `:root` element
- If no class is set, DS automatically respects system preferences via `@media (prefers-color-scheme: dark)`
- Persistence to localStorage is automatic thanks to existing logic in `useSettings`

---

## 2026-01-19 - Phase 29B: Readability Improvements

### Iteration Goal

Improve code readability by extracting magic numbers and simplifying complex conditionals.

### Completed

- [x] **29B.1:** Extracted magic numbers in `ResultsGrid.tsx`
  - Added named constants: `SCROLL_PADDING`, `SCROLLBAR_WIDTH`, `SCROLL_BUFFER`, `LONG_PRESS_DURATION`
  - Replaced 6 hardcoded values with descriptive constants

- [x] **29B.2:** Removed unreachable code in `ResultsGrid.tsx`
  - Removed `isColFocus && isRowFocus` (crosshair) condition
  - This condition was logically impossible: `isColFocus` requires `rowIndex !== position.row` while `isRowFocus` requires `rowIndex === position.row`
  - No CSS style `penaltyCellCrosshair` existed, confirming the code was dead

- [x] **29B.3:** Simplified `App.tsx` empty state cascade
  - Extracted 6-level ternary operator to `getViewState()` helper function
  - Added typed `ViewState` discriminated union for type safety
  - Replaced nested ternary with clean switch statement

### Notes

- WebSocket tests (16 failures) are a known issue from Phase 29H, not related to these changes
- All other tests pass (128/144)
- Build successful with no TypeScript errors

---

## 2026-01-19 - Phase 29G: Import/Export Cleanup

### Iteration Goal

Clean up imports and exports across the codebase - add barrel files, remove unused default exports.

### Completed

- [x] **29G.1:** Added `useMultiTap` export to `src/hooks/index.ts`
  - Updated `ResultsGrid.tsx` to use barrel import instead of deep import

- [x] **29G.2:** Created `src/utils/index.ts` barrel file
  - Exports `parseResultsGatesString` from `gates.ts`
  - Updated `ResultsGrid.tsx` to use barrel import

- [x] **29G.3:** Removed unused default exports
  - Removed `export default scoringApi` from `scoringApi.ts`
  - Removed `export default coursesApi` from `coursesApi.ts`
  - Simplified `services/index.ts` to only use named re-exports

- [x] **29G.4:** Verified `ws` is already in devDependencies (no change needed)

### File Changes

**New files:**
- `src/utils/index.ts` - barrel export for utils

**Modified files:**
- `src/hooks/index.ts` - added `useMultiTap` export
- `src/services/index.ts` - removed default export re-exports
- `src/services/scoringApi.ts` - removed default export
- `src/services/coursesApi.ts` - removed default export
- `src/components/ResultsGrid/ResultsGrid.tsx` - updated to use barrel imports

### Notes

- Build passes without errors
- WebSocket unit tests (16 failures) are pre-existing issue documented in Phase 29H
- All other tests pass (128/144)

---

## 2026-06-07 - Release Bundle Artifacts (#92)

### Iteration Goal

Attach the built application bundle to GitHub Releases. Until now releases only carried GitHub's auto-generated "Source code" archives — no deployable build.

### Completed

- [x] Added `attach-bundle` job to `.github/workflows/release-please.yml`
  - Runs only when `release-please` reports `releases_created == true` (i.e. the release PR was merged)
  - `npm ci` → `npm run build` → zip `dist/` → `gh release upload c123-penalty-check-<tag>.zip`
- [x] Forced `Release-As: 1.4.2` then `Release-As: 1.4.3` to exercise and verify the pipeline end-to-end (maintenance mode means only `chore(deps)` commits otherwise, which never trigger a release)

### Problems and Solutions

1. **Problem:** First run of `attach-bundle` failed on `npm ci` with `403 Forbidden - Permission installation not allowed to Read organization package` when fetching `@opencanoetiming/timing-design-system` from GitHub Packages.
   **Solution:** The job declared `permissions: contents: write`, which **replaces** the default token scopes and dropped `packages: read`. Added `packages: read` to the job's permissions block. (`ci.yml` works because it sets no job-level `permissions` and inherits the broader default.)
   **Lesson:** A job-level `permissions:` block is an allow-list, not a delta. List every scope the job needs — adding `contents: write` silently removes `packages: read`.

2. **Problem:** Manually backfilling the asset for v1.4.2 produced a zip ~40% larger than the CI build (741 KB vs 516 KB uncompressed) because the local `node_modules` had different dependency versions than the reproducible `npm ci`.
   **Solution:** Deleted the hand-built v1.4.2 asset rather than ship a non-faithful artifact. v1.4.2 stays asset-less (it predates the working pipeline); v1.4.3 onward gets the genuine CI-built bundle automatically.

### Notes

- `releases_created` / `tag_name` come from the `googleapis/release-please-action@v5` step (`id: release`), exposed as job outputs and gated with `needs.release-please.outputs.releases_created == 'true'`.
- Verified: v1.4.3 release carries `c123-penalty-check-v1.4.3.zip` (264 KB) with `index.html` at the zip root + `assets/` — directly deployable.
- Every future release now receives its bundle automatically; no manual step.

---

## Template for Further Entries

```markdown
## YYYY-MM-DD - Iteration X

### Iteration Goal
[What was supposed to be done]

### Completed
- [ ] Item 1
- [ ] Item 2

### Problems and Solutions
1. **Problem:** [description]
   **Solution:** [how it was resolved]

### Notes
[Anything important to remember]
```
