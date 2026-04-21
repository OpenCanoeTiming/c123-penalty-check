# Multi-Day Event Support — Design Spec

**Issue:** #58 — Application doesn't show the second day of multi-day events
**Date:** 2026-04-21
**Status:** Approved

---

## Problem

On multi-day events (e.g. Jarní závod 2026-04-18/19), the penalty-check app
shows only the first day's races in the RaceSelector dropdown. Second-day races
are hidden because the `activeRaces` filter requires status >= 3 (InProgress),
but next-day races have status 1 (StartList) until they begin.

Additionally, races from different days have **identical ShortTitle** values
(e.g. "K1M 1st Run" for both Saturday and Sunday), making them
indistinguishable even when both appear. The WebSocket TCP protocol sends
**empty `startTime`**, so the date cannot be derived from WebSocket data alone.

### Root cause analysis (verified with recording replay)

1. **`activeRaces` filter** (`status >= 3 && <= 5`) hides all next-day races
   (status 0 or 1) from the dropdown.
2. **Results arrive for current-day raceIds** only — selecting a previous-day
   race shows no data.
3. **ShortTitle is identical** between days — no day indicator in the name.
4. **`startTime` from WebSocket (TCP) is empty** — the C123 TCP protocol does
   not include StartTime in Schedule Race elements.
5. **`startTime` from REST API (XML file) has full ISO 8601** — e.g.
   `2026-04-18T08:30:00+02:00`. This is the only source of date information.
6. **localStorage** persists previous-day raceId across sessions, pointing to a
   race with no incoming data.

---

## Solution

### 1. REST API schedule enrichment

On WebSocket connect (and reconnect), fetch `GET /api/xml/schedule` to obtain
full ISO 8601 `startTime` for each race. Build a map `raceId → date string`
and merge into the schedule data.

- New hook: `useScheduleEnrichment` (or similar)
- Triggers on WebSocket `connected` state
- Derives HTTP base URL from existing `serverConfig` (already used for scoring API)
- Merges date into `ProcessedRace` as `date: string | null` (e.g. `"2026-04-19"`)
- WebSocket remains primary source for `raceStatus` and titles
- REST adds only the date field

This creates reusable REST fetch infrastructure for #39 (pre-load race data).

### 2. RaceSelector: show all races with date

**Remove the `activeRaces`-only filter.** Pass all races to the RaceSelector
dropdown, sorted by `order`.

Display format in dropdown options:

```
K1M 1st Run (18.4.)
C1Ž 1st Run (18.4.)
...
K1M 1st Run (19.4.)
```

Running races keep the `●` prefix:

```
● K1M 1st Run (19.4.)
```

**Single-day events:** If all races share the same date (or dates are
unavailable), omit the date suffix — show just the ShortTitle as today.

**REST fetch failure:** If the enrichment fetch fails, display races without
dates (graceful degradation). The dropdown still shows all races sorted by
`order`, just without `(D.M.)` suffix.

### 3. "Only running" checkbox

Add a checkbox next to the RaceSelector dropdown. Default: **OFF**.

When ON, filter the dropdown to show only races with status 3 (InProgress).
Label: "Only running" (or localized equivalent).

Prev/next arrow navigation operates within the currently visible (filtered)
list.

### 4. Auto-select validation (app start only)

Current logic: `effectiveSelectedRaceId = selectedRaceId ?? runningRace?.raceId ?? null`

Add one-time validation **on app start** when loading from localStorage:

- If stored raceId is **not present in the current schedule** OR a running
  race (status 3) exists → switch to the running race.
- Once the user manually selects a race, respect their choice unconditionally.

This prevents the stale-localStorage problem on day 2 without overriding
explicit user intent during the session.

---

## What does NOT change

- **RaceConfig, Results, OnCourse** — WebSocket data flow unchanged
- **Penalty submission** (`POST /api/c123/scoring`) — unchanged
- **Gate groups, checked state** — unchanged
- **c123-server** — no modifications (per project rules)

## Files to modify

| File | Change |
|------|--------|
| `src/hooks/useSchedule.ts` | Add `date` field to `ProcessedRace`, accept enrichment data |
| `src/types/c123server.ts` | Add types for REST schedule response if needed |
| New: `src/hooks/useScheduleEnrichment.ts` | REST fetch + merge logic |
| `src/components/RaceSelector/RaceSelector.tsx` | Show all races, date in name, "Only running" checkbox |
| `src/components/RaceSelector/RaceSelector.module.css` | Styles for checkbox |
| `src/App.tsx` | Pass all races (not just active), auto-select validation on start |

## Relation to other issues

- **#39 (pre-load race data from REST/XML):** The REST fetch infrastructure
  built here (HTTP client, base URL, error handling) serves as foundation for
  #39. That issue will extend it to pre-load Results and other race data.

---

## Test plan

- **Unit tests:** `useSchedule` with enrichment data, date formatting, filter logic
- **Integration:** Replay Sunday morning recording → verify all 20 races appear
  in dropdown with correct dates, Sunday races selectable and showing data
- **Screenshot tests:** Update static screenshots for new checkbox and date format
