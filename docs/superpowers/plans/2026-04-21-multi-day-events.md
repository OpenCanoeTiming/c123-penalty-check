# Multi-Day Event Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show all races (both days) in the RaceSelector dropdown with date suffixes, add "Only running" filter checkbox, fetch dates from REST API.

**Architecture:** On WebSocket connect, fetch `GET /api/xml/schedule` to get ISO 8601 `startTime` per race. Merge date info into `useSchedule` output. Pass all races (not just active) to RaceSelector. Add checkbox filter. Validate stale localStorage on startup.

**Tech Stack:** React 19, TypeScript, Vitest, Playwright, `@opencanoetiming/timing-design-system`

---

### Task 1: REST schedule fetcher service

**Files:**
- Create: `src/services/scheduleApi.ts`
- Test: `src/services/scheduleApi.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/scheduleApi.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchScheduleDates } from './scheduleApi'

describe('fetchScheduleDates', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns raceId-to-date map from REST schedule', async () => {
    const mockResponse = {
      schedule: [
        { raceId: 'K1M_BR1_18', startTime: '2026-04-18T08:30:00+02:00', raceStatus: 5 },
        { raceId: 'K1M_BR1_19', startTime: '2026-04-19T08:40:00+02:00', raceStatus: 1 },
      ],
    }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await fetchScheduleDates('http://localhost:27123')
    expect(result.get('K1M_BR1_18')).toBe('2026-04-18')
    expect(result.get('K1M_BR1_19')).toBe('2026-04-19')
  })

  it('returns empty map on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    const result = await fetchScheduleDates('http://localhost:27123')
    expect(result.size).toBe(0)
  })

  it('returns empty map on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    const result = await fetchScheduleDates('http://localhost:27123')
    expect(result.size).toBe(0)
  })

  it('handles missing or invalid startTime gracefully', async () => {
    const mockResponse = {
      schedule: [
        { raceId: 'K1M_BR1_18', startTime: '2026-04-18T08:30:00+02:00' },
        { raceId: 'K1M_BR1_19', startTime: undefined },
        { raceId: 'K1M_BR2_19', startTime: 'not-a-date' },
      ],
    }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await fetchScheduleDates('http://localhost:27123')
    expect(result.get('K1M_BR1_18')).toBe('2026-04-18')
    expect(result.has('K1M_BR1_19')).toBe(false)
    expect(result.has('K1M_BR2_19')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/scheduleApi.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/services/scheduleApi.ts`:

```typescript
/**
 * Schedule API Client
 *
 * Fetches schedule data from c123-server REST API (XML source).
 * Used to enrich WebSocket schedule with date information.
 */

import { getApiBaseUrl } from './serverConfig'

interface RestScheduleItem {
  raceId: string
  startTime?: string
}

interface RestScheduleResponse {
  schedule: RestScheduleItem[]
}

/**
 * Extract date string (YYYY-MM-DD) from ISO 8601 timestamp.
 * Returns null if the string doesn't contain a valid date.
 */
function extractDate(isoString: string | undefined): string | null {
  if (!isoString) return null
  const match = isoString.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/**
 * Fetch schedule from REST API and return a map of raceId → date (YYYY-MM-DD).
 * Returns empty map on any error (graceful degradation).
 */
export async function fetchScheduleDates(baseUrl?: string): Promise<Map<string, string>> {
  const url = baseUrl ?? getApiBaseUrl()
  try {
    const response = await fetch(`${url}/api/xml/schedule`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return new Map()

    const data: RestScheduleResponse = await response.json()
    const dateMap = new Map<string, string>()

    for (const item of data.schedule ?? []) {
      const date = extractDate(item.startTime)
      if (date) {
        dateMap.set(item.raceId, date)
      }
    }

    return dateMap
  } catch {
    return new Map()
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/scheduleApi.test.ts`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/scheduleApi.ts src/services/scheduleApi.test.ts
git commit -m "feat: add REST schedule date fetcher for multi-day events"
```

---

### Task 2: Add `date` field to `useSchedule` and `displayTitle`

**Files:**
- Modify: `src/hooks/useSchedule.ts`
- Modify: `src/hooks/useSchedule.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/hooks/useSchedule.test.ts`:

```typescript
// Add to imports at top:
// (no new imports needed)

// Add new describe block after existing tests:

describe('date enrichment', () => {
  const multiDaySchedule: C123ScheduleData = {
    races: [
      createScheduleRace({ raceId: 'K1M_BR1_18', order: 1, raceStatus: 5, shortTitle: 'K1M 1st Run' }),
      createScheduleRace({ raceId: 'K1M_BR1_19', order: 2, raceStatus: 1, shortTitle: 'K1M 1st Run' }),
    ],
  }

  const dateMap = new Map([
    ['K1M_BR1_18', '2026-04-18'],
    ['K1M_BR1_19', '2026-04-19'],
  ])

  it('adds date to ProcessedRace when dateMap provided', () => {
    const { result } = renderHook(() => useSchedule(multiDaySchedule, dateMap))

    expect(result.current.races[0].date).toBe('2026-04-18')
    expect(result.current.races[1].date).toBe('2026-04-19')
  })

  it('date is null when no dateMap provided', () => {
    const { result } = renderHook(() => useSchedule(multiDaySchedule))

    expect(result.current.races[0].date).toBeNull()
    expect(result.current.races[1].date).toBeNull()
  })

  it('isMultiDay is true when races span multiple dates', () => {
    const { result } = renderHook(() => useSchedule(multiDaySchedule, dateMap))
    expect(result.current.isMultiDay).toBe(true)
  })

  it('isMultiDay is false when all races on same date', () => {
    const sameDayMap = new Map([
      ['K1M_BR1_18', '2026-04-18'],
      ['K1M_BR1_19', '2026-04-18'],
    ])
    const { result } = renderHook(() => useSchedule(multiDaySchedule, sameDayMap))
    expect(result.current.isMultiDay).toBe(false)
  })

  it('isMultiDay is false when no dateMap', () => {
    const { result } = renderHook(() => useSchedule(multiDaySchedule))
    expect(result.current.isMultiDay).toBe(false)
  })

  it('displayTitle includes date suffix for multi-day events', () => {
    const { result } = renderHook(() => useSchedule(multiDaySchedule, dateMap))

    expect(result.current.races[0].displayTitle).toBe('K1M 1st Run (18.4.)')
    expect(result.current.races[1].displayTitle).toBe('K1M 1st Run (19.4.)')
  })

  it('displayTitle equals shortTitle for single-day events', () => {
    const { result } = renderHook(() => useSchedule(multiDaySchedule))

    expect(result.current.races[0].displayTitle).toBe('K1M 1st Run')
    expect(result.current.races[1].displayTitle).toBe('K1M 1st Run')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useSchedule.test.ts`
Expected: FAIL — `useSchedule` doesn't accept second argument, `date`/`displayTitle`/`isMultiDay` don't exist

- [ ] **Step 3: Implement changes to useSchedule**

Modify `src/hooks/useSchedule.ts`. The full updated file:

```typescript
import { useMemo } from 'react'
import type { C123ScheduleData, C123ScheduleRace } from '../types/c123server'

// =============================================================================
// Types
// =============================================================================

/**
 * Race status values from C123 (source: RaceStati.cs)
 * Normal progression: 0 -> 1 -> 3 -> 4 -> 5
 */
export type RaceStatus =
  | 0 // Scheduled
  | 1 // StartList
  | 2 // Delayed
  | 3 // InProgress
  | 4 // Unofficial (results being processed)
  | 5 // Official (results published)
  | 6 // Revised
  | 7 // Cancelled
  | 8 // GettingReady
  | 9 // Unconfirmed
  | 10 // Protested
  | 11 // Interrupted
  | 12 // Rescheduled
  | 13 // Postponed

export interface ProcessedRace {
  raceId: string
  order: number
  mainTitle: string
  subTitle: string
  shortTitle: string
  displayTitle: string // shortTitle with date suffix for multi-day events
  raceStatus: RaceStatus
  startTime: string
  date: string | null // YYYY-MM-DD from REST enrichment
  isActive: boolean // Status 3-5: running or finished
  isRunning: boolean // Status 3: currently in progress
  isFinished: boolean // Status 5: completed
}

export interface UseScheduleReturn {
  /** All races from schedule */
  races: ProcessedRace[]
  /** Races that are active (status >= 3) */
  activeRaces: ProcessedRace[]
  /** Currently running race (status 3) */
  runningRace: ProcessedRace | null
  /** Find race by ID */
  getRaceById: (raceId: string) => ProcessedRace | undefined
  /** Whether the event spans multiple days */
  isMultiDay: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format YYYY-MM-DD as "D.M." (Czech short date).
 */
function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  return `${parseInt(day, 10)}.${parseInt(month, 10)}.`
}

function processRace(
  race: C123ScheduleRace,
  dateMap: Map<string, string> | undefined,
  isMultiDay: boolean
): ProcessedRace {
  const status = race.raceStatus as RaceStatus
  const date = dateMap?.get(race.raceId) ?? null
  const shortTitle = race.shortTitle || race.mainTitle
  const displayTitle =
    isMultiDay && date ? `${shortTitle} (${formatShortDate(date)})` : shortTitle

  return {
    raceId: race.raceId,
    order: race.order,
    mainTitle: race.mainTitle,
    subTitle: race.subTitle,
    shortTitle,
    displayTitle,
    raceStatus: status,
    startTime: race.startTime,
    date,
    isActive: status >= 3 && status <= 5,
    isRunning: status === 3,
    isFinished: status === 5,
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSchedule(
  schedule: C123ScheduleData | null,
  dateMap?: Map<string, string>
): UseScheduleReturn {
  const isMultiDay = useMemo(() => {
    if (!dateMap || dateMap.size === 0) return false
    const uniqueDates = new Set(dateMap.values())
    return uniqueDates.size > 1
  }, [dateMap])

  const races = useMemo(() => {
    if (!schedule?.races) return []
    return schedule.races
      .map((r) => processRace(r, dateMap, isMultiDay))
      .sort((a, b) => a.order - b.order)
  }, [schedule, dateMap, isMultiDay])

  const activeRaces = useMemo(
    () => races.filter((r) => r.isActive),
    [races]
  )

  const runningRace = useMemo(
    () => races.find((r) => r.isRunning) ?? null,
    [races]
  )

  const getRaceById = useMemo(() => {
    const raceMap = new Map(races.map((r) => [r.raceId, r]))
    return (raceId: string) => raceMap.get(raceId)
  }, [races])

  return {
    races,
    activeRaces,
    runningRace,
    getRaceById,
    isMultiDay,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useSchedule.test.ts`
Expected: PASS (all tests including new ones)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSchedule.ts src/hooks/useSchedule.test.ts
git commit -m "feat: add date enrichment and displayTitle to useSchedule"
```

---

### Task 3: Integrate REST fetch into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add schedule enrichment fetch**

In `src/App.tsx`, add the REST schedule fetch triggered by WebSocket connection state. Changes to `AppContent`:

At the top of `AppContent`, after the existing `useC123WebSocket` call (line ~128), add:

```typescript
// Fetch schedule dates from REST API when connected
const [dateMap, setDateMap] = useState<Map<string, string>>(new Map())
useEffect(() => {
  if (connectionState !== 'connected') return
  let cancelled = false
  fetchScheduleDates().then((map) => {
    if (!cancelled && map.size > 0) setDateMap(map)
  })
  return () => { cancelled = true }
}, [connectionState])
```

Add import at top:
```typescript
import { fetchScheduleDates } from './services/scheduleApi'
```

Change the `useSchedule` call to pass `dateMap`:
```typescript
const { races, activeRaces, runningRace, getRaceById, isMultiDay } = useSchedule(schedule, dateMap)
```

- [ ] **Step 2: Pass all races to Header instead of activeRaces**

Change the Header `races` prop (currently `activeRaces`) and add `onlyRunning` filter state:

```typescript
// "Only running" filter state
const [onlyRunning, setOnlyRunning] = useState(false)

// Races to show in selector: all races, or only running
const visibleRaces = useMemo(
  () => onlyRunning ? races.filter((r) => r.isRunning) : races,
  [races, onlyRunning]
)
```

In the JSX, update Header props:
```tsx
<Header
  races={visibleRaces}
  selectedRaceId={effectiveSelectedRaceId}
  onSelectRace={handleSelectRace}
  isConnected={connectionState === 'connected'}
  onOpenSettings={() => setShowSettings(true)}
  onlyRunning={onlyRunning}
  onToggleOnlyRunning={() => setOnlyRunning((v) => !v)}
/>
```

Also update the `getViewState` call: replace `activeRaces.length` with `races.length` so the "no-races" empty state checks total races, not just active:
```typescript
const viewState = getViewState(
  connectionState,
  races.length,
  selectedRace,
  selectedRaceResults,
  raceConfig
)
```

- [ ] **Step 3: Add stale localStorage validation**

Replace the `effectiveSelectedRaceId` computation:

```typescript
// Auto-select: validate stored raceId on initial load
const hasUserSelected = useRef(false)
const effectiveSelectedRaceId = useMemo(() => {
  if (hasUserSelected.current && selectedRaceId) return selectedRaceId
  // If stored raceId is valid in current schedule, use it
  if (selectedRaceId && getRaceById(selectedRaceId)) return selectedRaceId
  // Fallback to running race
  return runningRace?.raceId ?? null
}, [selectedRaceId, getRaceById, runningRace])
```

Update `handleSelectRace` to set the flag:
```typescript
const handleSelectRace = useCallback((raceId: string) => {
  hasUserSelected.current = true
  setSelectedRaceId(raceId)
  try {
    localStorage.setItem(STORAGE_KEY_SELECTED_RACE, raceId)
  } catch {
    // Ignore localStorage errors
  }
}, [])
```

Add `useRef` to the React import at top of file.

- [ ] **Step 4: Run `npm run build` to verify no type errors**

Run: `npx tsc -b`
Expected: No errors (Header props will fail — that's addressed in Task 4)

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate REST schedule enrichment and show all races"
```

---

### Task 4: Update Header and RaceSelector

**Files:**
- Modify: `src/components/Header/Header.tsx`
- Modify: `src/components/RaceSelector/RaceSelector.tsx`
- Modify: `src/components/RaceSelector/RaceSelector.module.css`

- [ ] **Step 1: Update Header to pass new props through**

Modify `src/components/Header/Header.tsx`:

```typescript
import {
  Header as DSHeader,
  HeaderBrand,
  HeaderTitle,
  HeaderStatus,
  LiveBadge,
  Button,
} from '@opencanoetiming/timing-design-system'
import { RaceSelector } from '../RaceSelector'
import type { ProcessedRace } from '../../hooks/useSchedule'
import styles from './Header.module.css'

interface HeaderProps {
  // Race selection
  races: ProcessedRace[]
  selectedRaceId: string | null
  onSelectRace: (raceId: string) => void
  // Filter
  onlyRunning: boolean
  onToggleOnlyRunning: () => void
  // Connection status
  isConnected: boolean
  // Actions
  onOpenSettings: () => void
}

export function Header({
  races,
  selectedRaceId,
  onSelectRace,
  onlyRunning,
  onToggleOnlyRunning,
  isConnected,
  onOpenSettings,
}: HeaderProps) {
  return (
    <DSHeader variant="compact">
      <HeaderBrand>
        <HeaderTitle>C123-SCORING</HeaderTitle>
      </HeaderBrand>

      <div className={styles.raceSelector}>
        <RaceSelector
          races={races}
          selectedRaceId={selectedRaceId}
          onSelectRace={onSelectRace}
          onlyRunning={onlyRunning}
          onToggleOnlyRunning={onToggleOnlyRunning}
        />
      </div>

      <HeaderStatus>
        {isConnected && <LiveBadge />}
        <Button
          variant="ghost"
          size="sm"
          icon
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings (Ctrl+,)"
          style={{ fontSize: '1.25rem' }}
        >
          ⚙
        </Button>
      </HeaderStatus>
    </DSHeader>
  )
}
```

- [ ] **Step 2: Update RaceSelector to use displayTitle and add checkbox**

Full replacement of `src/components/RaceSelector/RaceSelector.tsx`:

```typescript
import { useMemo } from 'react'
import { Select, Button } from '@opencanoetiming/timing-design-system'
import type { ProcessedRace } from '../../hooks/useSchedule'
import styles from './RaceSelector.module.css'

interface RaceSelectorProps {
  races: ProcessedRace[]
  selectedRaceId: string | null
  onSelectRace: (raceId: string) => void
  onlyRunning: boolean
  onToggleOnlyRunning: () => void
}

export function RaceSelector({
  races,
  selectedRaceId,
  onSelectRace,
  onlyRunning,
  onToggleOnlyRunning,
}: RaceSelectorProps) {
  // Find current index in races array
  const currentIndex = useMemo(() => {
    if (!selectedRaceId) return -1
    return races.findIndex((r) => r.raceId === selectedRaceId)
  }, [races, selectedRaceId])

  // Previous and next races
  const prevRace = currentIndex > 0 ? races[currentIndex - 1] : null
  const nextRace = currentIndex < races.length - 1 ? races[currentIndex + 1] : null

  const handlePrev = () => {
    if (prevRace) {
      onSelectRace(prevRace.raceId)
    }
  }

  const handleNext = () => {
    if (nextRace) {
      onSelectRace(nextRace.raceId)
    }
  }

  // Check if any race is running (to show/enable checkbox)
  const hasRunningRaces = races.some((r) => r.isRunning)

  if (races.length === 0) {
    return (
      <div className={styles.selector}>
        <span className={styles.noRaces}>
          {onlyRunning ? 'No running races' : 'No races'}
        </span>
      </div>
    )
  }

  return (
    <div className={styles.selector}>
      {/* Previous arrow */}
      <Button
        variant="ghost"
        size="sm"
        icon
        onClick={handlePrev}
        disabled={!prevRace}
        aria-label={prevRace ? `Previous: ${prevRace.displayTitle}` : 'No previous race'}
        title={prevRace ? `Previous: ${prevRace.displayTitle}` : undefined}
        className={styles.navButton}
      >
        ◀
      </Button>

      {/* Race dropdown */}
      <Select
        size="sm"
        value={selectedRaceId ?? ''}
        onChange={(e) => onSelectRace(e.target.value)}
        aria-label="Select race"
        className={styles.select}
      >
        <option value="" disabled>
          Select race...
        </option>
        {races.map((race) => (
          <option key={race.raceId} value={race.raceId}>
            {race.isRunning ? '● ' : ''}
            {race.displayTitle}
          </option>
        ))}
      </Select>

      {/* Next arrow */}
      <Button
        variant="ghost"
        size="sm"
        icon
        onClick={handleNext}
        disabled={!nextRace}
        aria-label={nextRace ? `Next: ${nextRace.displayTitle}` : 'No next race'}
        title={nextRace ? `Next: ${nextRace.displayTitle}` : undefined}
        className={styles.navButton}
      >
        ▶
      </Button>

      {/* Only running filter */}
      {hasRunningRaces && (
        <label className={styles.filterLabel} title="Show only currently running races">
          <input
            type="checkbox"
            checked={onlyRunning}
            onChange={onToggleOnlyRunning}
            className={styles.filterCheckbox}
          />
          <span className={styles.filterText}>Only running</span>
        </label>
      )}

      {/* Next race label (visible on wider screens) */}
      {nextRace && (
        <span className={styles.nextLabel} title={`Next: ${nextRace.displayTitle}`}>
          {nextRace.displayTitle}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add checkbox styles**

Append to `src/components/RaceSelector/RaceSelector.module.css`:

```css
.filterLabel {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}

.filterCheckbox {
  margin: 0;
  cursor: pointer;
}

.filterText {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Hide filter label text on smaller screens, keep checkbox */
@media (max-width: 1024px) {
  .filterText {
    display: none;
  }
}
```

- [ ] **Step 4: Verify build**

Run: `npx tsc -b`
Expected: No type errors

- [ ] **Step 5: Run all unit tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/Header/Header.tsx src/components/RaceSelector/RaceSelector.tsx src/components/RaceSelector/RaceSelector.module.css
git commit -m "feat: show all races with dates, add only-running filter"
```

---

### Task 5: Playwright test with recording replay

**Files:**
- Modify: `tests/screenshots-with-data.spec.ts`

- [ ] **Step 1: Start player + c123-server**

In separate terminals:

```bash
# Terminal 1: player (Sunday morning, speed 10 to get into race data quickly)
cd ../c123-protocol-docs && node tools/player.js \
  "$(node tools/recordings-cli.js path 2026-04-19-jarni-ne-do)" \
  --autoplay --speed 10 --xml-out /tmp/c123-replay.xml

# Terminal 2: c123-server
cd ../c123-server && npm start -- --host 127.0.0.1 --xml /tmp/c123-replay.xml --no-discovery --no-tray

# Terminal 3: dev server
npm run dev
```

- [ ] **Step 2: Add multi-day screenshot test**

Add to `tests/screenshots-with-data.spec.ts` (after existing tests):

```typescript
test('20 - multi-day race selector with dates', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(3000);

  // Verify dropdown has races with date suffixes
  const raceSelector = page.locator('select[aria-label="Select race"]');
  await raceSelector.click();
  await takeDocScreenshot(page, '20-multi-day-race-selector');
});

test('21 - multi-day grid with sunday race data', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(3000);

  // Select a Sunday race (look for 19.4. in option text)
  const raceSelector = page.locator('select[aria-label="Select race"]');
  const options = page.locator('select[aria-label="Select race"] option');
  const count = await options.count();
  for (let i = 0; i < count; i++) {
    const text = await options.nth(i).textContent();
    if (text?.includes('19.4.') && text?.includes('K1M') && text?.includes('1st')) {
      const value = await options.nth(i).getAttribute('value');
      if (value) {
        await raceSelector.selectOption(value);
        break;
      }
    }
  }

  // Wait for grid data
  await page.waitForSelector('.results-grid tbody tr', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await takeDocScreenshot(page, '21-multi-day-sunday-grid');
});
```

- [ ] **Step 3: Run the screenshot tests**

Run: `npx playwright test tests/screenshots-with-data.spec.ts`
Expected: PASS — screenshots saved to `docs/screenshots/`

- [ ] **Step 4: Verify screenshots visually**

Check:
- `docs/screenshots/20-multi-day-race-selector.png` — dropdown shows races with `(18.4.)` and `(19.4.)` suffixes
- `docs/screenshots/21-multi-day-sunday-grid.png` — grid shows Sunday race data with competitor rows

- [ ] **Step 5: Commit**

```bash
git add tests/screenshots-with-data.spec.ts docs/screenshots/
git commit -m "test: add multi-day event screenshot tests with recording replay"
```

---

### Task 6: Final verification and cleanup

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
npx tsc -b
npx eslint .
```

Expected: All pass, no errors

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Final commit and push**

```bash
git push -u origin feat/58-multi-day-events
```
