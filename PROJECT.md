# C123-PENALTY-CHECK - Project Overview

Web application with highly optimized UX for penalty verification and correction in canoe slalom races timed with Canoe123 system.

## Motivation

Reimplementation of the existing C123 terminal. Reasons:

- **Ergonomics for all-day work** - the app is used for many hours during race days
- **Clarity** - original terminal is small and unclear, especially when tired
- **Readability** - sufficient font size and element sizing, clear visual state differentiation
- **Error reduction** - clear indication of active cell, action confirmations
- **Operator comfort** - minimized clicking, efficient keyboard shortcuts

---

## Architecture

The application runs as a **pure frontend solution** (React + TypeScript) and communicates with **c123-server** as backend:

```
c123-penalty-check (this project)
    │
    ├─► WebSocket ws://server:27123/ws  (reading real-time data)
    │     - OnCourse, Results, RaceConfig, Schedule
    │
    └─► REST API http://server:27123/api/c123/*  (writing)
          - POST /api/c123/scoring
          - POST /api/c123/remove-from-course
          - POST /api/c123/timing
```

**Why c123-server?**
- Browser cannot communicate directly with C123 (TCP:27333)
- c123-server already has implemented Write API for sending penalties
- Shared infrastructure with scoreboard

**Reference:** Connection analogous to `c123-scoreboard` - see `../c123-scoreboard/src/types/c123server.ts`

---

## Main Requirements

### Data Display

- Display active races based on state (Schedule), indication of active race
- Competitor grid showing: who will race, who is racing, who finished, penalty status
- Updates according to race and course settings (RaceConfig - gate types N/R differentiation)

### Penalty Editing

- Efficient "inline" editing in penalty table
- Arrow key navigation, keyboard control
- Input without unnecessary clicking
- Penalties match race type (0 = clean, 2 = touch, 50 = missed)
- Very clear navigation - always see which competitor and which gate being edited
- **Submission:** REST API `POST /api/c123/scoring`

### Protocol Verification

- Per-gate verification against the paper protocol - `Space` toggles a gate between plain and verified; `Shift+Space` (or tapping a section's boundary handle) verifies every gate in its group at once
- Four cell states, most prominent signal first: **flagged** > **stale** > **verified** > **plain**
  - **Stale** - a verified gate whose live value has since drifted from what was checked (e.g. corrected on the original C123 terminal instead of this app) - re-entering the correct value through this app re-verifies it automatically, no extra keystroke
  - **Flagged** - an open review flag (a *podnět*) raised on a gate, with an optional suggested value and comment; stays visible even on a DNS/DNF/DSQ row, since a flag is often the dispute over the removal itself
- Verification state is per-event, stored server-side (`c123-server`'s Penalty Checks API) and broadcast live over WebSocket - a gate verified on one tablet appears verified on every other tablet and survives a page reload
- Right-click / long-press context menu mirrors the keyboard: verify gate, verify section, add or resolve a flag
- Per-race progress indicator in the race switcher and a footer progress meter for the selected race
- Gracefully disables itself (with a badge explaining why) against a `c123-server` older than the version that added the Penalty Checks API, rather than breaking penalty entry
- Gate grouping capability:
  - Controller receives paper protocol for only a few gates
  - Default groups based on C123 course segment settings
  - Ability to redefine in application
  - Support for overlapping segments (e.g., judge 1: gates 1-4, judge 2: gates 5-8, helper: gates 4-6)

### Persistence

- Settings in localStorage
- Server address, selected race, gate group configuration

---

## Communication with c123-server

### WebSocket - Reading Data

| Message | Content | Usage |
|---------|---------|-------|
| `OnCourse` | Competitors on course, penalties per gate | Main data for grid |
| `Results` | Category results | Historical data, verification |
| `RaceConfig` | nrGates, gateConfig (N/R) | Grid configuration |
| `Schedule` | Race list, raceStatus | Category switching |

### REST API - Writing

```typescript
// Penalty
POST /api/c123/scoring
{ "bib": "10", "gate": 5, "value": 2 }

// Competitor status (DNS/DNF/CAP)
POST /api/c123/remove-from-course
{ "bib": "10", "reason": "DNS" }

// Manual timing impulse
POST /api/c123/timing
{ "bib": "10", "channelPosition": "Start" }
```

---

## Sources and Documents

### For Implementation

| Source | Purpose |
|--------|---------|
| `../c123-server/docs/REST-API.md` | REST API documentation |
| `../c123-server/docs/C123-PROTOCOL.md` | WebSocket protocol |
| `../c123-scoreboard/src/types/c123server.ts` | TypeScript types (can copy/adapt) |
| `../timing-design-system/` | UI components and tokens |

### For Business Logic

| Source | Purpose |
|--------|---------|
| `./resources-private/` | Original implementation (READONLY, do not mention in code) |
| `../c123-protocol-docs/c123-xml-format.md` | Penalty format (Gates field) |

---

## Technology

- **React** + TypeScript
- **Vite** as build tool
- **@opencanoetiming/timing-design-system** for UI
- **localStorage** for persistence
- **WebSocket** for real-time data
- **fetch** for REST API

---

## Differences from Scoreboard

| Aspect | c123-scoreboard | c123-penalty-check |
|--------|-----------------|--------------|
| Purpose | Results display | Penalty entry |
| Data direction | Read only | Read + write |
| Interaction | Passive | Active (editing) |
| API | WebSocket only | WebSocket + REST |
| Main data | Results, OnCourse | OnCourse (penalties per gate) |
