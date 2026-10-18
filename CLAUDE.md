# Claude Code Instructions - C123 Penalty Check

## Project

C123 Penalty Check — web application for penalty verification and correction in canoe slalom races timed with Canoe123. Tablet-optimized UI for comparing digital penalties against paper protocols.

**GitHub:** OpenCanoeTiming/c123-penalty-check | **License:** MIT | **Status:** Migration to the on-site contract in M4 (Rebuild 2026/27); venues run `legacy-2026` (v1.5.2)

---

## Rebuild 2026/27 — read first

- **Design (normative):** c123-server `main`, `docs/arch/` — start at `README.md` (reading order, implementation sequence); then `CONTRACTS.md`, `DECISIONS/ADR-*`, `TEST-ARCHITECTURE.md`. Point to it, never restate it. Defaults taken without the maintainer go to `DECISIONS/LOG.md`.
- **Legacy line:** venues run tag `legacy-2026`; branch `legacy/2026` takes `fix:` commits only. `main` is the rebuild, in place: replaced code is deleted, never kept beside the new.
- **Releases:** rebuild code reaches no venue. Release Please PRs on `main` stay unmerged during the rebuild (no 1.x release from rebuild code); the rebuild ships as `Release-As: 2.0.0` when M6 Release 1.0 closes (see "Rebuild versioning" below).
- **Order:** server → scoreboard → penalty-check → live-mini is the implementation order only. Everything, the new live included, is ready for the Jarní slalom (M6), its first real use: no shadow run, the legacy line is the fallback.
- **Work items:** one issue each in project "Rebuild 2026/27" (https://github.com/orgs/OpenCanoeTiming/projects/3), milestones M0 Spike, freeze, merge · M1 Server core · M2 Tooling · M3 Scoreboard · M4 Penalty-check · M5 Live · M6 Release 1.0 (Jarní slalom). Implementation is on hold until the maintainer releases M1.
- **Test-first:** failing tests from the vectors or obligations land before the code that passes them. Tiers and the `Clock` rule: `TEST-ARCHITECTURE.md` §3, §5.
- **Client repos:** definition of done = `CLIENT-OBLIGATIONS.md` Common + "c123-penalty-check". A wrong obligation is fixed in c123-server `docs/arch` (same PR as the cited section, or label `obligations-unchanged`), never by deviating here.
- **Upstream provenance** stays in the private c123-protocol-docs repo; public repos state behaviour only, never how it was established.
- **Git:** conventional commits; Release Please owns versions and CHANGELOG; squash merges; `git add <file>`, never commit `.claude/` or `.superpowers/`. Czech with the maintainer, English in code, commits and docs.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  c123-penalty-check (FE)                    │
│                      React + TypeScript                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
   WebSocket /ws                    REST API
   (real-time data)              (scoring commands)
          │                               │
          └───────────────┬───────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   c123-server :27123                        │
│                      (Node.js)                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼ TCP :27333
┌─────────────────────────────────────────────────────────────┐
│                       Canoe123                              │
└─────────────────────────────────────────────────────────────┘
```

**Key principle:** c123-penalty-check talks only to c123-server, never to Canoe123, and keeps no terminal channel of its own (CONTRACTS §7.3).

---

## Key References

| Purpose | Path |
|---------|------|
| **Definition of done (M4)** | `../c123-server/docs/arch/CLIENT-OBLIGATIONS.md` → Common + "c123-penalty-check" |
| **Target contract** | `../c123-server/docs/arch/CONTRACTS.md` §2.9, §2.10, §7 |
| **Project overview** | `./PROJECT.md` |
| **Server REST API (legacy wire)** | `../c123-server/docs/REST-API.md` |
| **WebSocket protocol (legacy wire)** | `../c123-server/docs/C123-PROTOCOL.md` |
| **Protocol docs** | `../c123-protocol-docs/` |
| **Recordings for testing** | `../c123-protocol-docs/recordings/` |
| **Design system** | `../timing-design-system/` |
| **Private resources** | `./resources-private/` (read-only, not in git; never quote or name its contents in code, commits, issues or PRs) |

---

## Important Rules

1. **Contract first** — this repo consumes CONTRACTS §7; it never works around the server. A missing or wrong server behaviour is an issue (or docs/arch PR) in c123-server, not client logic here.
2. **Tablet-first** — optimized for 1024px/1366px breakpoints
3. **Design system mandatory** — use `@opencanoetiming/timing-design-system`, no inline styles
4. **Screenshots after visual changes** — run `./scripts/take-screenshots.sh`

---

## Communication with c123-server (legacy wire, until M4)

Target (M4): CONTRACTS §7.1–§7.4 and CLIENT-OBLIGATIONS "c123-penalty-check" — one penalty write with an `Idempotency-Key`, no status/mark write, checks and flags on the server; this section is retired with the migration.

### WebSocket (reading data)

Connection: `ws://<server>:27123/ws`

| Type | Content | Usage |
|------|---------|-------|
| `OnCourse` | Competitors on course + penalties | Main data for grid |
| `Results` | Category results | Historical data |
| `RaceConfig` | Gate count, types (N/R) | Grid configuration |
| `Schedule` | Race list + status | Category switching |

### REST API (writing)

```
POST /api/c123/scoring           { "bib": "10", "gate": 5, "value": 2 }
POST /api/c123/remove-from-course { "bib": "10", "reason": "DNS" }
POST /api/c123/timing            { "bib": "10", "channelPosition": "Start" }
```

---

## Project Structure

```
src/
├── App.tsx, main.tsx
├── components/   # ResultsGrid, RaceSelector, FlagDialog, CheckProgress, GateGroupEditor, Settings, Header, Layout, …
├── hooks/        # useC123WebSocket, useScoring, useChecks, useSchedule, useGateGroups, useKeyboardInput, …
├── services/     # http, scoringApi, checksApi, coursesApi, resultsApi, scheduleApi, discovery-client, …
├── store/  styles/  types/  utils/
tests/            # Playwright e2e + screenshots; mock-ws-server.ts (legacy, retired in M4)
resources-private/  # not in git
```

---

## Key Features

1. **Server connection** — WebSocket to c123-server
2. **Race display** — active races from Schedule, active indicators
3. **Competitor grid** — who will race, who is racing, who finished, penalty status
4. **Inline editing** — keyboard control, arrow navigation
5. **Penalty submission** — through c123-server (legacy: `POST /api/c123/scoring`; target: CONTRACTS §7.3)
6. **Gate grouping** — by segments or custom groups
7. **Protocol verification** — marking verified protocols
8. **Persistence** — UI settings and the selected race in localStorage; checks and flags on the server

---

## Development

```bash
# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Tests
npm test
```

**Testing with c123-server:** use the player recipe in `../c123-server/CLAUDE.md` ("Testing with recorded data"), or `./scripts/take-screenshots.sh`, which starts both. Behaviour tests for the migration are tier 3 (TEST-ARCHITECTURE §3.3); `tests/mock-ws-server.ts` is retired then (CLIENT-OBLIGATIONS, rendering clients, "Tests").

---

## Screenshots

**After every visual UI change, update screenshots!**

```bash
# Full pipeline: static tests, then player.js replay + c123-server + Playwright
# (ports 27123/27333 must be free)
./scripts/take-screenshots.sh

# Static screenshots only (no server)
./scripts/take-screenshots.sh --static-only
```

**Test files:**
- `tests/screenshots-static.spec.ts` — without data (loading, disconnected, settings)
- `tests/screenshots-with-data.spec.ts` — with replay data (grid, gates, actions)

---

## Workflow

Rebuild rules: see "Rebuild 2026/27 — read first" above. Every change starts with a GitHub issue.

### 1. Rozbor (Analysis)
- Comment on issue: restate problem, challenge the idea, define scope, identify risks
- Use `/second-opinion` for non-trivial architectural decisions

### 2. Plan
- Use Claude Code plan mode to design implementation
- Post plan summary to issue: key decisions, files to change, approach
- Get user confirmation before implementation

### 3. Implement
- Branch from main: `feat/{N}-{slug}` or `fix-{N}-{slug}`
- Commit incrementally, push regularly
- Comment on issue with progress updates

### 4. PR & Review
- Every issue → PR with `Closes #N`
- Include the verification: commands run, exit codes, CI run link; for a migration item, the CLIENT-OBLIGATIONS lines it closes
- Summarize what changed and why

---

## DEVLOG.md

Append-only record of dead ends, surprising problems, and solutions. Never edit existing entries.

```markdown
## YYYY-MM-DD — Short description

**Problem:** What went wrong or didn't work
**Attempted:** What was tried
**Solution:** What actually worked (or: still open)
**Lesson:** What to remember next time
```

---

## Language

- User communication: **Czech**
- Documentation (README, docs): **English**
- Code, comments, commit messages: **English**

---

## Commit Message Format

```
feat: add penalty grid with keyboard navigation
fix: correct gate grouping logic
refactor: extract WebSocket logic to hook
```

---

## Versioning & Releases

This project uses **Release Please** (commit-based) for automatic versioning. **Never manually bump `package.json` version or edit `CHANGELOG.md`** — Release Please owns both via its rolling release PR.

### How it works

1. Every push to `main` runs `.github/workflows/release-please.yml`.
2. Release Please keeps a rolling **release PR** open (label `autorelease: pending`) that aggregates pending changes and proposes the next version.
3. Merging the release PR creates a commit `chore(main): release X.Y.Z`, tag `vX.Y.Z`, and a GitHub Release with generated CHANGELOG.
4. Penalty-check is a browser app, not an npm package — there is no `publish.yml`. The GitHub Release is the release artifact.

### Commit types and bump rules

| Commit type | Bump | Shown in CHANGELOG |
|---|---|---|
| `feat:` | **minor** | ✓ Features |
| `fix:` / `perf:` | **patch** | ✓ Bug Fixes / Performance |
| `feat!:` or `BREAKING CHANGE:` | **major** | ✓ Features |
| `revert:` | none | ✓ Reverts |
| `docs:` | none | hidden |
| `chore:` / `ci:` / `test:` / `style:` / `refactor:` / `build:` | **none** | hidden |
| `chore(deps):` / `chore(deps-dev):` (dependabot) | **none** | hidden |

### Rules for agents preparing PRs

1. **Always use conventional commits** (`feat:`, `fix:`, `chore:`...). Release Please reads commit prefixes to decide bumps.
2. **Don't edit `package.json` version or `CHANGELOG.md`** in regular PRs — Release Please owns those.
3. **Don't merge the release PR together with feature PRs** — it must be the last to merge in a release cycle.
4. **PR title should keep the commit prefix** (squash merges — ensure the final merged commit stays conventional).
5. **Never commit skill state** — `.superpowers/` and `.claude/` are local per-session tool state. Prefer `git add <file>` over `git add -A`. Already added to `.gitignore` in this repo.
6. **Dependency bumps on `@opencanoetiming/timing-design-system`** are a separate `chore:` commit, not bundled with feature work.

### Rebuild versioning (maintainer decision 2026-10-18)

During the rebuild, the Release Please PR on `main` is left **unmerged**: no 1.x release is cut from rebuild code (any `feat:` on `main` would otherwise propose 1.6.0). When milestone M6 Release 1.0 closes, the rebuild ships as 2.0.0, with this footer on the closing commit:

```
Release-As: 2.0.0
```

Venue fixes in the meantime go to `legacy/2026`.
