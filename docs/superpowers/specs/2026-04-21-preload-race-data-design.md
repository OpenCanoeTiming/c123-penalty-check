# Pre-load Race Data from REST API — Design Spec

**Issue:** #39 — pre-load race data from Rest(XML) endpoint
**Date:** 2026-04-21
**Status:** Approved

---

## Problem

The penalty grid only shows data when WebSocket Results messages arrive — which
only happens for currently active races. When the operator switches to a
completed race or an upcoming race, the grid is empty. This forces the operator
to wait for races to start before they can review or prepare.

Additionally, `raceConfig` (gate count, N/R configuration) comes from WebSocket
as a single object for the running race. When switching to a race on a different
course (e.g., different day = different course), the grid shows the wrong gate
configuration.

## Solution

### 1. c123-server REST API extensions (exception to "do not modify" rule)

**a) Add `gates` to Results response**

`GET /api/xml/races/:id/results` — add `gates` field (space-separated per-gate
penalties, same format as WebSocket/TCP) to each result row. The data exists in
the XML file's `<Gates>` element but is currently not exposed.

**b) Add `courseNr` to Schedule response**

`GET /api/xml/schedule` — add `courseNr` field (integer, 1-based) to each
schedule item. Maps race → course for gate configuration lookup.

### 2. Courses fetch on connect

On connect/reconnect, fetch `GET /api/xml/courses` to get per-course gate
configuration. Store as `Map<courseNr, CourseConfig>` where:

```typescript
interface CourseConfig {
  courseNr: number
  nrGates: number
  gateConfig: string  // "NNRNNR..." (N/R only, S stripped)
}
```

Combined with `courseNr` from schedule, this gives per-race gate config.

### 3. Lazy Results fetch on race switch

When user selects a race with no WebSocket Results data:

1. Fetch `GET /api/xml/races/:raceId/results`
2. Transform REST format → `C123ResultsData` (WebSocket format)
3. Store in the existing `results` Map

**Transformation:**
- `time`: centiseconds (7899) → string seconds ("78.99")
- `total`: centiseconds → string seconds
- `gates`: pass through (same format)
- `pen`, `rank`, `status`, `startOrder`: pass through
- `participant.familyName + givenName` → `name`

**Priority:** WebSocket Results (real-time) always override REST-fetched data.

### 4. Per-race RaceConfig

Replace single `raceConfig` with per-race resolution:

- For selected race: look up `courseNr` from schedule → get `CourseConfig` from
  courses map → use as `raceConfig`
- WebSocket `RaceConfig` messages update the config for the currently running
  race (more accurate for live data)
- REST courses data serves as fallback for all other races

---

## Files to modify

### c123-server

| File | Change |
|------|--------|
| `src/service/XmlDataService.ts` | Add `gates` to result rows, add `courseNr` to schedule items |
| `src/service/__tests__/XmlDataService.test.ts` | Tests for new fields |
| `docs/REST-API.md` | Document new fields |

### c123-penalty-check

| File | Change |
|------|--------|
| `src/services/scheduleApi.ts` | Extend to also return `courseNr` per race |
| New: `src/services/coursesApi.ts` | Fetch `/api/xml/courses`, parse courseConfig |
| New: `src/services/resultsApi.ts` | Fetch `/api/xml/races/:id/results`, transform to C123ResultsData |
| `src/hooks/useSchedule.ts` | Add `courseNr` to ProcessedRace |
| `src/App.tsx` | Courses fetch on connect, lazy results fetch, per-race raceConfig |

## What does NOT change

- WebSocket data flow (Schedule, OnCourse, Results, RaceConfig messages)
- ResultsGrid component (consumes same C123ResultsData type)
- Scoring API (POST endpoints)
- Gate groups, checked state

## Test plan

- Unit tests for REST → WebSocket transformation
- Unit tests for courseConfig parsing
- Integration test: replay Sunday morning recording, switch to Saturday race,
  verify grid shows data with correct gate config
