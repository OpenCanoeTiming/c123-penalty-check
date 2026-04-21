# Claude Code Instructions - C123 Penalty Check

## Project

C123 Penalty Check — web application for penalty verification and correction in canoe slalom races timed with Canoe123. Tablet-optimized UI for comparing digital penalties against paper protocols.

**GitHub:** OpenCanoeTiming/c123-penalty-check | **License:** MIT | **Status:** v1.1.0 — stable, maintenance mode

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

**Key principle:** c123-penalty-check communicates exclusively with c123-server, never directly with C123.

---

## Key References

| Purpose | Path |
|---------|------|
| **Project overview** | `./PROJECT.md` |
| **Server REST API** | `../c123-server/docs/REST-API.md` |
| **WebSocket protocol** | `../c123-server/docs/C123-PROTOCOL.md` |
| **Protocol docs** | `../c123-protocol-docs/` |
| **Recordings for testing** | `../c123-protocol-docs/recordings/` |
| **Design system** | `../timing-design-system/` |
| **Private resources** | `./resources-private/` (READONLY, do not mention in code) |

---

## Important Rules

1. **DO NOT MODIFY c123-server** — server is stable, changes only with explicit approval
2. **Tablet-first** — optimized for 1024px/1366px breakpoints
3. **Design system mandatory** — use `@opencanoetiming/timing-design-system`, no inline styles
4. **Screenshots after visual changes** — run `./scripts/take-screenshots.sh`

---

## Communication with c123-server

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
c123-penalty-check/
├── src/
│   ├── index.tsx             # Entry point
│   ├── App.tsx               # Main component
│   ├── components/           # UI components
│   │   ├── RaceSelector/     # Race selection
│   │   ├── PenaltyGrid/      # Penalty grid
│   │   └── ConnectionStatus/ # Connection status
│   ├── hooks/                # React hooks
│   │   ├── useWebSocket.ts   # WebSocket connection
│   │   └── useScoring.ts     # Scoring API calls
│   ├── services/             # API communication
│   │   └── scoringApi.ts     # REST API client
│   ├── store/                # State management
│   └── types/                # TypeScript types
├── resources-private/        # Source materials (NOT in git)
└── package.json
```

---

## Key Features

1. **Server connection** — WebSocket to c123-server
2. **Race display** — active races from Schedule, active indicators
3. **Competitor grid** — who will race, who is racing, who finished, penalty status
4. **Inline editing** — keyboard control, arrow navigation
5. **Penalty submission** — REST API POST /api/c123/scoring
6. **Gate grouping** — by segments or custom groups
7. **Protocol verification** — marking verified protocols
8. **Persistence** — settings in localStorage

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

**Testing with c123-server:**
```bash
# In another terminal start c123-server
cd ../c123-server && npm start

# Penalty check connects to ws://localhost:27123/ws
```

---

## Screenshots

**After every visual UI change, update screenshots!**

```bash
# Full pipeline: replay + c123-server + dev server + Playwright
./scripts/take-screenshots.sh

# Static screenshots only (no server)
./scripts/take-screenshots.sh --static-only
```

**Test files:**
- `tests/screenshots-static.spec.ts` — without data (loading, disconnected, settings)
- `tests/screenshots-with-data.spec.ts` — with replay data (grid, gates, actions)

---

## Workflow

Issue-driven development. Every change starts with a GitHub issue.

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
- Include test plan in PR description
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
| `revert:` / `docs:` | none | ✓ Reverts / Documentation |
| `chore:` / `ci:` / `test:` / `style:` / `refactor:` / `build:` | **none** | hidden |
| `chore(deps):` / `chore(deps-dev):` (dependabot) | **none** | hidden |

Project is in maintenance mode — most activity is dependabot `chore(deps*)` which produces no bump. This is intentional.

### Rules for agents preparing PRs

1. **Always use conventional commits** (`feat:`, `fix:`, `chore:`...). Release Please reads commit prefixes to decide bumps.
2. **Don't edit `package.json` version or `CHANGELOG.md`** in regular PRs — Release Please owns those.
3. **Don't merge the release PR together with feature PRs** — it must be the last to merge in a release cycle.
4. **PR title should keep the commit prefix** (squash merges — ensure the final merged commit stays conventional).
5. **Never commit skill state** — `.superpowers/` and `.claude/` are local per-session tool state. Prefer `git add <file>` over `git add -A`. Already added to `.gitignore` in this repo.
6. **Dependency bumps on `@opencanoetiming/timing-design-system`** are a separate `chore:` commit, not bundled with feature work.

### Forcing a specific version

To force a release to a specific version, add this footer to a commit in the next release cycle:

```
Release-As: 2.0.0
```
