# Advanced Penalty Checks Workflow — Design Spec

**Issue:** #4 — Advanced penalty checks workflow
**Server counterpart:** OpenCanoeTiming/c123-server #6 (PR #24, merged, released 0.12.0)
**Date:** 2026-08-03
**Status:** Approved

---

## Problem

The operator in the timing office receives paper protocols from section judges
and must confirm, gate by gate, that the penalties recorded in Canoe123 match
them. Today the app can display and overwrite penalties, but it has no way to
record that anyone verified them.

The head judge needs a trustworthy answer to "is this run verified?" before
declaring results official. Without one, verification lives in the operator's
head and is lost on any interruption.

### Current state

`useCheckedState` (`src/hooks/useCheckedState.ts`, 248 lines) implements
localStorage-backed check state keyed by `bib:groupId`. It is **dead code in
practice**: `App.tsx:276` consumes only `getProgress`, and nothing anywhere
calls `setChecked`, `toggleChecked`, `checkMultiple` or `uncheckMultiple`.
The progress indicator in the footer (`App.tsx:347`) therefore always reads 0%.

There is no UI to mark anything as verified. This is not a broken feature — the
input side was never built. The hook's `bib:groupId` granularity also does not
match the per-gate model the server now persists.

---

## Goal

Let the operator work through paper protocols against Canoe123 systematically,
always knowing what remains, and surface a per-run "verified" state that the
head judge can rely on when announcing results.

---

## Rules

| # | Rule |
|---|---|
| 1 | The base unit is **a single gate**. Bulk-verifying **one competitor's section** is an accelerator; without gate groups defined the operator works gate by gate and loses nothing. |
| 2 | **Gate:** arrow keys and spacebar. **Section:** a visible control on the section boundary *inside the row*, plus **Shift+Space** for the section containing the focused cell. |
| 3 | **An empty gate cannot be verified.** A value must be entered first. Bulk-verifying a section verifies the rest, **skips the empty gate and moves focus to it**. A section is not complete while an empty gate remains. |
| 4 | **The operator's own correction also verifies the gate**, with no extra keystroke. |
| 5 | A change made by someone else, or directly in Canoe123, **invalidates the verification**. |
| 6 | Flags (podněty) are a rare side branch. They can be **created and resolved**, and must not slow the main flow down. |
| 7 | Only **finished runs without a status** count toward verification. |
| 8 | State **survives a browser restart and moving to another tablet**. One operator today; live updates yes, conflict resolution no. |
| 9 | State is tracked **per race and indicated in the race switcher**. "Done" means *everything finished so far is verified*; when another competitor finishes, the indication clears. |

### Width constraint

At 24 gates the grid is roughly 1210px wide (gate cell 36px,
`ResultsGrid.module.css:124`; frozen row headers ~350px) and already scrolls
horizontally at 1024px. The section control must reuse the existing 2px group
boundary (`ResultsGrid.module.css:141`), widened to a usable ~12px touch
target: about +48px at four sections, under 4% of a width that already
overflows. No new column may be introduced.

---

## Out of scope

- A manager dashboard spanning races. Verification state appears only in the
  operator's own race switcher.
- An audit trail of who verified what and when. `checkedBy` was deliberately
  rejected in server #6.
- Batch write endpoints. Explicitly retained as a server-side decision.
- Rewriting the existing scoring path. Verification hangs off it.
- **Team races.** Individual runs use 0/2/50; team races carry cumulative
  values such as 52/100/150 (`c123-server` `src/checks/types.ts`). The app does
  not support them today (`PenaltyValue = 0 | 2 | 50 | null`,
  `src/types/scoring.ts:18`). This spec keeps the **stored snapshot and the
  check data model as a plain number**, so adding team races later is an
  extension rather than a rewrite — but no team-race UI is built now.

---

## Interaction model

### Cursor and scope

Focus is a single gate cell, as today (`useFocusNavigation`). Arrow keys move
between cells.

**Space toggles** the focused gate: it verifies an unverified gate and
un-verifies a verified one. On an **empty gate it does nothing** and reports why
— rule 3 makes an empty gate unverifiable, and silently ignoring the keystroke
would read as a dropped input.

**Shift+Space verifies** every gate in the section containing the focus. It only
ever verifies; un-verifying stays a per-gate action, so a stray Shift+Space
cannot wipe a whole section's work.

Section bulk-verification, whether by control or by Shift+Space, applies rule 3:
gates holding a value are verified, the first empty gate is skipped and receives
focus so it can be filled immediately.

### Section control

The existing group boundary inside each row becomes the control. It is
row-scoped and section-scoped by position, so there is no ambiguity about which
competitor it applies to — unlike a column header, which belongs to every row.

### Cell state

A cell must carry four things at once: penalty value, verified or not, whether
the verification went stale, and whether a flag is attached. The value keeps the
cell's centre; the other three are expressed through background tone and a thin
edge marker that consumes no width.

**The exact visual treatment is deliberately not fixed here.** Four states in a
36px cell readable on a tablet in daylight is a question to be settled by
building it and looking at it against replayed race data, not by agreeing on it
in a document.

---

## Server contract

Server 0.12.0 provides everything needed. Endpoints used:

| Method | Path | Use |
|---|---|---|
| GET | `/api/checks` | Load every race at once on startup — feeds rule 9 |
| PUT | `/api/checks/:raceId/check` | Verify a gate |
| DELETE | `/api/checks/:raceId/check` | Un-verify a gate |
| POST | `/api/checks/:raceId/flag` | Create a flag |
| PATCH | `/api/checks/:raceId/flag/:id` | Resolve a flag (server auto-creates the check) |
| DELETE | `/api/checks/:raceId/flag/:id` | Delete a flag |

`GET /api/checks/:raceId` and `DELETE /api/checks/:raceId` exist but are not
needed: the all-races read covers loading, and clearing a whole race is not an
operator action in this design.

### The `value` contract

`PUT /check` **must always be called with an explicit `value`**. When omitted,
the server snapshots the gate from the XML, and Canoe123 has not rewritten the
XML yet after a scoring write — the check would capture the previous value and
look stale the moment it was created (`c123-server` `docs/REST-API.md:1855`).

### WebSocket events

`ChecksChanged` carries five events, not the three named in #6:
`check-set`, `check-removed`, `check-invalidated`, `checks-cleared`,
`checks-reset`. **`checks-reset` arrives with an empty `raceId` and means every
race was discarded** — the client must drop all local check state, not just one
race's. `FlagChanged` carries `flag-created`, `flag-resolved`, `flag-deleted`,
and includes the auto-created check on resolve.

`FlagEntry` carries `bib` and `gate` inside the entry, not only in the map key.

---

## Data flow

**Load.** On connect, `GET /api/checks` once. Keep the whole event's check state
in memory; the race switcher reads per-race aggregates from it, the grid reads
the selected race's slice.

**Verify a gate.** Optimistic local update, then `PUT /check` with the current
value. On failure, roll back and surface the error — a silently dropped
verification is worse than a visible one.

**Correct and verify (rule 4).** `POST /api/c123/scoring`, await it, then
`PUT /check` with the value just written. The server's invalidation hook removes
the check during the scoring call, so the order matters: check after scoring,
never before.

**Remote changes (rule 5).** `ChecksChanged: check-invalidated` arrives over the
WebSocket when anyone writes a penalty through the server. Changes made directly
in Canoe123 bypass the server entirely and are detected client-side by comparing
the stored `check.value` snapshot against the live value; a mismatch renders as
stale rather than verified.

**Race indicator (rule 9).** Per race: denominator is finished runs without a
status × their gates; numerator is verified gates among them. "Done" when the
two are equal and non-zero. It clears by itself when a new finisher enlarges the
denominator — no extra bookkeeping.

---

## Error handling

**Server without the checks API.** If `GET /api/checks` returns 404 or 503, the
verification feature is **disabled with a visible explanation**, not silently
backed by localStorage. Local-only state would look identical to shared state
while breaking rule 8's promise that verification survives a move to another
tablet — a false sense of safety is the worse failure.

**Write failures.** Optimistic updates roll back on error. The existing pending
write indicator (`App.tsx:337`) is the precedent to follow.

**Partial section bulk.** Verifying a section issues one request per gate
(batch writes are out of scope by decision). Gates that succeed stay verified;
those that fail roll back individually and the section simply reads as
incomplete. No all-or-nothing semantics.

**`checks-reset`.** Drop all local state and re-read.

---

## Components

| Component | Change |
|---|---|
| `useCheckedState` | Replaced. Per-gate keying against the server, WebSocket-driven updates, optimistic writes. The `bib:groupId` model and localStorage layer go away. |
| `ResultsGrid` | Cell verification state, section boundary control, Space / Shift+Space handling. |
| `RaceSelector` / `Header` | Per-race verification indicator. |
| `CheckProgress` | Kept; fed by the new hook. Denominator restricted to finished runs. |
| Flags UI | New, minimal. Placement deferred to implementation. |

---

## Testing

Unit tests for the state hook: optimistic update and rollback, snapshot-based
stale detection, the five `ChecksChanged` events including `checks-reset`,
section bulk with an empty gate.

Integration against a real recording from `c123-protocol-docs` rather than
synthetic fixtures — this is what issue #52 asks for, and verification behaviour
depends on realistic penalty patterns and partially finished races.

Playwright screenshots after the visual work, per the project rule.

---

## Deferred to implementation

- The visual treatment of four cell states.
- Where the flags UI lives.
- Whether `POST /api/checks/new-event` (the operator override when the
  fingerprint heuristic treats a new event as a continuation) belongs in this
  app or in the server's admin dashboard.

## Note on server #6

The body of `c123-server` #6 still documents a `GET /api/checks/:raceId/stats`
endpoint that was never implemented, and describes the fingerprint as sorted
race IDs when the shipped implementation uses `raceId@YYYY-MM-DD` tokens with a
50% overlap tolerance. The issue is closed; the code and `docs/REST-API.md` are
correct. Treat those two points in #6 as historical, not as contract.
