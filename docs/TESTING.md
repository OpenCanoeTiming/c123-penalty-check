# Testing Guide

This document describes testing infrastructure for c123-scoring.

## Test Types

### Unit Tests (Vitest)

Unit tests verify individual functions and React hooks. Located alongside source files with `.test.ts` extension.

**Running unit tests:**

```bash
# Run all unit tests
npm run test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

**Test files:**

| File | Coverage |
|------|----------|
| `src/utils/gates.test.ts` | Gates parsing functions (OnCourse/Results format) |
| `src/hooks/useSchedule.test.ts` | Schedule parsing and race filtering |
| `src/hooks/useGateGroups.test.ts` | Gate grouping logic and localStorage |
| `src/hooks/useCheckedState.test.ts` | Protocol checking state management |

### E2E Tests (Playwright)

End-to-end tests verify complete user flows. Located in `tests/` directory.

**Running E2E tests:**

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:ui

# Run specific test file
npx playwright test e2e.spec.ts
```

**Test files:**

| File | Description |
|------|-------------|
| `tests/e2e.spec.ts` | Core functionality (connection, settings, layout, accessibility) |
| `tests/screenshots-static.spec.ts` | Static UI states (no server required) |
| `tests/screenshots-with-data.spec.ts` | Screenshots with real data (requires replay-server) |

## Test Data

### Static XML Captures

XML files with complete race data. Useful for manual testing and understanding data structure.

**Location:** `../c123-protocol-docs/captures/`

**Files:**
- `xboardtest02_jarni_v1.xml` - Spring slalom 2024
- `2024-LODM-fin.xml` - LODM 2024 (complex race with Cross)

**Usage with c123-server:**

```bash
# Terminal 1: Start c123-server with static XML
cd ../c123-server
npm start -- --xml ../c123-protocol-docs/captures/xboardtest02_jarni_v1.xml

# Terminal 2: Start c123-scoring dev server
npm run dev
```

**Limitations:** Static XML shows final race state only, no live updates.

### Live Recordings (JSONL)

Recorded WebSocket sessions with timestamps. Simulates live race with competitors starting, on course, and finishing.

**Location:** `../c123-protocol-docs/recordings/`

**Files:**
- `rec-2025-12-28T09-34-10.jsonl` - 4 minutes of K1m race (~1000 messages)

**Format:**

```jsonl
{"_meta": {"version": 2, "recorded": "2025-12-28T09:34:10", "host": "192.168.1.100"}}
{"ts": 0, "src": "tcp", "type": "RaceConfig", "data": "<xml>...</xml>"}
{"ts": 5000, "src": "tcp", "type": "OnCourse", "data": "<xml>...</xml>"}
```

**Usage with replay-server:**

```bash
# Terminal 1: Start replay-server (emulates C123 on TCP:27333)
cd ../c123-protocol-docs/tools
node replay-server.js ../recordings/rec-2025-12-28T09-34-10.jsonl

# Terminal 2: Start c123-server (connects to replay-server)
cd ../c123-server
npm start -- --host localhost

# Terminal 3: Start c123-scoring
npm run dev
```

**Replay options:**
- `--speed 2` - 2x playback speed
- `--loop` - Continuous replay
- `--port 27334` - Different port

### Test Fixtures

JSON fixtures for unit tests.

**Location:** `src/test/fixtures/`

**Files:**
- `sample-data.ts` - Gate strings, configs, competitor data

**Adding new fixtures:**

1. Extract data from JSONL recording or XML capture
2. Create typed fixture in `sample-data.ts`
3. Use in tests via import

## Mock Server

For tests that need WebSocket but not real data:

```bash
npm run mock-server
```

This starts a minimal WebSocket server on port 27123 that sends Connected message and sample data.

**Source:** `tests/mock-ws-server.ts`

## Screenshots

Screenshots are used for documentation and visual regression.

**Location:** `docs/screenshots/`

**Generating screenshots:**

```bash
# With live data (requires replay-server + c123-server running)
npx playwright test screenshots-with-data.spec.ts

# Static states only
npx playwright test screenshots-static.spec.ts
```

**Current screenshots:**

| Screenshot | Description |
|------------|-------------|
| `01-disconnected.png` | No connection state |
| `02-connecting.png` | Connecting animation |
| `03-settings-panel.png` | Settings modal (Server tab) |
| `04-settings-keyboard.png` | Keyboard shortcuts tab |
| `05-no-races.png` | Connected, no active races |
| `07-race-selector.png` | Race dropdown with options |
| `08-grid-finished.png` | Main grid with results |
| `09-grid-cell-focus.png` | Focused penalty cell |
| `10-grid-oncourse-section.png` | On-course section |
| `11-gate-group-switcher.png` | Gate group buttons |
| `12-gate-group-editor.png` | Gate group editor modal |
| `13-competitor-actions.png` | Competitor context menu |
| `14-check-progress.png` | Footer with check progress |
| `15-mobile-view.png` | Mobile responsive layout |
| `16-mobile-settings.png` | Settings on mobile |

## Creating New Recordings

Use the recorder tool to capture live C123 data:

```bash
cd ../c123-protocol-docs/tools
node recorder.js <C123_IP>
# Press Ctrl+C to stop
# Output: recordings/rec-YYYY-MM-DDTHH-MM-SS.jsonl
```

## Debugging Tests

### Playwright Debug Mode

```bash
# Run with browser visible
npx playwright test --headed

# Debug specific test
npx playwright test e2e.spec.ts --debug

# Generate trace
npx playwright test --trace on
```

### Vitest Debug

```bash
# Run specific test with verbose output
npm run test -- --reporter=verbose gates.test.ts
```

## CI/CD

Tests are configured to run on CI but workflow is not yet implemented (see PLAN.md Faze 15.5).

**Recommended CI steps:**

1. `npm ci`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. `npx playwright install --with-deps`
6. `npm run test:e2e`
