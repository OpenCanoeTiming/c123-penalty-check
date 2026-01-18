# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-16

### Added

#### Core Features
- **Penalty Grid** - Real-time display of competitors and their gate penalties
  - Keyboard navigation (arrow keys, Tab, Home/End, PageUp/PageDown)
  - Keyboard input for penalties (0, 2, 5 keys)
  - Visual indicators for penalty states (clear/touch/miss)
  - Support for reverse gates (highlighted in purple)

- **Race Selector** - Quick switching between active races
  - Shows race status (running, finished, waiting)
  - Displays competitor count for each race
  - Auto-selects running race on connect
  - Persists selection to localStorage

- **Gate Grouping** - Configure gate groups for section controllers
  - Visual editor with quick range selection
  - Custom naming and color coding
  - Keyboard shortcuts (0-9) for quick switching
  - Filter grid to show only selected gates
  - Persists configuration per race

- **Protocol Check Tracking** - Track verified competitor protocols
  - Per-competitor, per-gate-group check state
  - Progress bar showing completion status
  - Persists to localStorage per race
  - Auto-resets when gate group changes

- **Competitor Actions** - DNS/DNF/CAP removal and manual timing
  - Context menu via 'D' key or mouse
  - Confirmation dialogs for destructive actions
  - Manual start/finish timing triggers

- **Settings Panel** - Comprehensive configuration
  - Server URL with validation and history
  - Connection test functionality
  - Display options (show/hide on-course competitors)
  - Keyboard shortcuts reference
  - Accessible via Ctrl+, shortcut

#### UI/UX
- Real-time WebSocket connection to c123-server
- Connection status indicator with latency
- Toast notifications for API feedback
- Empty states for disconnected/no-races/no-competitors
- Error boundary with fallback UI
- Animations and transitions (respects reduced-motion)
- Focus trap in modals for accessibility
- Touch device optimization (44px+ touch targets)
- Responsive layout

#### Developer Experience
- TypeScript with strict mode
- ESLint and Prettier configuration
- Design system integration (@opencanoetiming/timing-design-system)
- Optimized production bundle with vendor chunk splitting

### Technical Details
- Built with Vite + React 19 + TypeScript
- WebSocket with auto-reconnect (exponential backoff)
- REST API integration with retry logic
- Optimistic updates for penalty submission
- localStorage persistence for settings and state
- ARIA attributes for accessibility
- CSS Grid layout with sticky headers

### Documentation
- Comprehensive README with usage instructions
- Implementation plan (PLAN.md)
- Development log (DEVLOG.md)
- Project instructions for Claude Code (CLAUDE.md)

---

[1.0.0]: https://github.com/OpenCanoeTiming/c123-penalty-check/releases/tag/v1.0.0
