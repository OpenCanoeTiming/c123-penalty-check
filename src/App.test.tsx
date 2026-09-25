/**
 * App-level wiring tests (task 11 review, Important-1).
 *
 * The logic behind rule 4 and the graceful-disable gate is unit-tested in
 * isolation in src/utils/verification.test.ts - but nothing pinned the
 * *wiring* that feeds them: whether ResultsGrid/Header actually receive the
 * right callbacks with the right arguments. Two real bugs at that level
 * (an off-by-one gate index, and a hard-coded `true` in place of
 * `checks.available`) passed the full suite silently before this file
 * existed. These tests mock only what AppContent itself calls
 * (useC123WebSocket, useChecks, useScoring, useSchedule, useGateGroups, and
 * the REST services its effects touch) and capture the real props App.tsx
 * hands to the real ResultsGrid/Header components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, screen, fireEvent } from '@testing-library/react'
import { AppContent } from './App'
import type { Settings } from './hooks/useSettings'
import type { C123ResultsData, C123RaceConfigData } from './types/c123server'

vi.mock('./hooks/useC123WebSocket')
// Mocks only the `useChecks` hook itself, not the whole module: `isProgressDone`
// (also exported from this file) is a pure function CheckProgress.tsx calls
// directly (via the hooks barrel), and the footer-wiring test below needs the
// *real* implementation running to prove App.tsx feeds it real data - a bare
// `vi.mock('./hooks/useChecks')` auto-mocks every export, including this one,
// which would make that test pass unconditionally (isProgressDone -> undefined
// -> isComplete always false) regardless of what openFlags value actually
// reaches it.
vi.mock('./hooks/useChecks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/useChecks')>()
  return { ...actual, useChecks: vi.fn() }
})
vi.mock('./hooks/useScoring')
vi.mock('./hooks/useSchedule')
vi.mock('./hooks/useGateGroups')
vi.mock('./services/scheduleApi')
vi.mock('./services/coursesApi')
vi.mock('./services/resultsApi')
// Partial, not a bare auto-mock: the real useChecks module is loaded above
// (for isProgressDone) and imports ChecksUnavailableError from here, so that
// class has to stay real. Only the two functions App.tsx calls directly are
// replaced.
vi.mock('./services/checksApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/checksApi')>()
  return { ...actual, createFlag: vi.fn(), resolveFlag: vi.fn() }
})

import { useC123WebSocket } from './hooks/useC123WebSocket'
import { useChecks } from './hooks/useChecks'
import { useScoring } from './hooks/useScoring'
import { useSchedule } from './hooks/useSchedule'
import { useGateGroups } from './hooks/useGateGroups'
import { fetchScheduleEnrichment } from './services/scheduleApi'
import { fetchCourses } from './services/coursesApi'
import { fetchRaceResults } from './services/resultsApi'
import { createFlag, resolveFlag } from './services/checksApi'
import { ApiRequestError } from './services/http'

// Captures the props App.tsx actually passes to ResultsGrid/Header, without
// rendering their (unrelated, already-tested-elsewhere) internals. Every
// other component from the barrel (Layout, Settings, EmptyState, ...) stays
// real - Layout in particular is what puts children in the DOM at all.
let gridProps: Record<string, unknown> | null = null
let headerProps: Record<string, unknown> | null = null

vi.mock('./components', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./components')>()
  return {
    ...actual,
    ResultsGrid: (props: Record<string, unknown>) => {
      gridProps = props
      return <div data-testid="mock-grid" />
    },
    Header: (props: Record<string, unknown>) => {
      headerProps = props
      return <div data-testid="mock-header" />
    },
  }
})

const RACE_ID = 'R1'

const race = {
  raceId: RACE_ID,
  order: 1,
  mainTitle: 'K1m',
  subTitle: '',
  shortTitle: 'K1m',
  displayTitle: 'K1m',
  date: null,
  courseNr: null,
  raceStatus: 3,
  startTime: '10:00:00',
  isActive: true,
  isRunning: true, // so effectiveRaceConfig takes the WS raceConfig directly
  isFinished: false,
}

// Gates deliberately hold three distinct values, at three distinct indices,
// so an off-by-one index bug (App.tsx's getLiveGateValue) reads a wrong but
// still-plausible value instead of failing loudly.
const raceResults: C123ResultsData = {
  raceId: RACE_ID,
  classId: 'K1M',
  isCurrent: true,
  mainTitle: 'K1m',
  subTitle: '',
  rows: [
    {
      rank: 1,
      bib: '42',
      name: 'Test Competitor',
      givenName: '',
      familyName: '',
      club: '',
      nat: '',
      startOrder: 1,
      startTime: '',
      gates: '0 2 50',
      pen: 2,
      time: '90.00',
      total: '92.00',
      behind: '',
    },
  ],
}

const raceConfig: C123RaceConfigData = {
  nrSplits: 0,
  nrGates: 3,
  gateConfig: 'NNN',
  gateCaptions: '1,2,3',
}

const testSettings: Settings = {
  serverUrl: 'ws://localhost:27123/ws',
  serverHistory: [],
  clientId: 'test-client',
  theme: 'auto',
  sortBy: 'startOrder',
}

function setupChecks(overrides: Record<string, unknown> = {}) {
  vi.mocked(useChecks).mockReturnValue({
    available: true,
    unavailableReason: null,
    loading: false,
    races: {},
    reload: vi.fn(),
    getStatus: vi.fn(() => 'plain'),
    getFlags: vi.fn(() => []),
    getRaceProgress: vi.fn(() => ({ checked: 0, total: 0, openFlags: 0, done: false })),
    applyCheckEvent: vi.fn(),
    applyFlagEvent: vi.fn(),
    verifyGate: vi.fn().mockResolvedValue(true),
    unverifyGate: vi.fn().mockResolvedValue(true),
    toggleGate: vi.fn().mockResolvedValue(true),
    verifySection: vi.fn().mockResolvedValue({ verified: [], firstEmpty: null }),
    ...overrides,
  } as never)
}

beforeEach(() => {
  gridProps = null
  headerProps = null
  localStorage.clear()

  vi.mocked(useC123WebSocket).mockReturnValue({
    connectionState: 'connected',
    serverInfo: null,
    onCourse: null,
    results: new Map([[RACE_ID, raceResults]]),
    raceConfig,
    schedule: null,
    lastError: null,
    lastMessageTime: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: true,
  } as never)

  vi.mocked(useScoring).mockReturnValue({
    setGatePenalty: vi.fn().mockResolvedValue(true),
    pendingOperations: new Map(),
    lastError: null,
    isLoading: false,
    removeFromCourse: vi.fn(),
    sendTimingImpulse: vi.fn(),
    isPending: vi.fn(() => false),
    clearError: vi.fn(),
  } as never)

  vi.mocked(useSchedule).mockReturnValue({
    races: [race],
    activeRaces: [race],
    runningRace: race,
    getRaceById: vi.fn((id: string) => (id === RACE_ID ? race : undefined)),
    isMultiDay: false,
  } as never)

  vi.mocked(useGateGroups).mockReturnValue({
    allGroups: [],
    segmentGroups: [],
    customGroups: [],
    activeGroup: null,
    activeGroupId: null,
    totalGates: 3,
    availableCourses: [],
    coursesLoading: false,
    setActiveGroup: vi.fn(),
    addGroup: vi.fn(),
    updateGroup: vi.fn(),
    removeGroup: vi.fn(),
  } as never)

  vi.mocked(fetchScheduleEnrichment).mockResolvedValue({
    dateMap: new Map(),
    courseNrMap: new Map(),
  })
  vi.mocked(fetchCourses).mockResolvedValue(new Map())
  vi.mocked(fetchRaceResults).mockResolvedValue(null)
  vi.mocked(createFlag).mockResolvedValue({} as never)
  vi.mocked(resolveFlag).mockResolvedValue({} as never)

  setupChecks()
})

describe('AppContent verification wiring (task 11 review, Important-1)', () => {
  it('passes verification props to the grid and the race switcher when checks are available', async () => {
    setupChecks({ available: true })
    // Async act: flushes the schedule/courses REST-fetch effect's mocked
    // promises (they resolve on a microtask after render() itself returns)
    // before assertions run, so the effect's own setState calls don't land
    // outside act().
    await act(async () => {
      render(<AppContent settings={testSettings} updateSettings={vi.fn()} />)
    })

    expect(gridProps).not.toBeNull()
    expect(typeof gridProps!.getGateStatus).toBe('function')
    expect(typeof gridProps!.onToggleCheck).toBe('function')
    expect(typeof gridProps!.onVerifySection).toBe('function')
    expect(typeof gridProps!.getOpenFlag).toBe('function')
    expect(typeof gridProps!.onAddFlag).toBe('function')
    expect(typeof gridProps!.onResolveFlag).toBe('function')

    expect(headerProps).not.toBeNull()
    expect(typeof headerProps!.getRaceCheckState).toBe('function')
  })

  it('passes no verification props at all when checks are unavailable (graceful disable)', async () => {
    setupChecks({ available: false, unavailableReason: { status: 404, message: 'nope' } })
    await act(async () => {
      render(<AppContent settings={testSettings} updateSettings={vi.fn()} />)
    })

    expect(gridProps).not.toBeNull()
    for (const key of [
      'getGateStatus',
      'onToggleCheck',
      'onVerifySection',
      'getOpenFlag',
      'onAddFlag',
      'onResolveFlag',
    ]) {
      expect(key in gridProps!).toBe(false)
    }

    expect(headerProps).not.toBeNull()
    expect('getRaceCheckState' in headerProps!).toBe(false)
  })

  it('shows why verification is unavailable as visible text, not just a title attribute', async () => {
    // A `title` tooltip never appears on a touch device, and this app is
    // built for a tablet - the explanation useChecks goes to real trouble to
    // produce (404 vs 503 mean different things to the operator) must be
    // readable on screen.
    setupChecks({
      available: false,
      unavailableReason: { status: 503, message: 'Load an XML file into the server first.' },
    })
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(<AppContent settings={testSettings} updateSettings={vi.fn()} />)
    })

    expect(view.getByText('Load an XML file into the server first.')).toBeInTheDocument()
  })

  it('reads the live gate value at gate-1, not gate, when toggling a check', async () => {
    const toggleGate = vi.fn().mockResolvedValue(true)
    setupChecks({ available: true, toggleGate })
    await act(async () => {
      render(<AppContent settings={testSettings} updateSettings={vi.fn()} />)
    })

    expect(gridProps).not.toBeNull()
    act(() => {
      ;(gridProps!.onToggleCheck as (bib: string, gate: number) => void)('42', 2)
    })

    // gates '0 2 50' -> index 0 = 0, index 1 = 2, index 2 = 50. Gate 2
    // (1-based) must read index 1 (value 2, [gate - 1]), not index 2
    // (value 50, the neighbouring gate's value at [gate]).
    expect(toggleGate).toHaveBeenCalledWith(RACE_ID, '42', 2, 2)
  })

  // flag-blocks-done review, Important-1: getRaceCheckState (fed to the race
  // switcher) and footerProgress (fed to the footer bar) are the only path
  // by which the real openFlags reaches either "done" indicator. Nothing
  // above exercised that wiring with a non-zero openFlags - a hardcoded
  // `openFlags: 0` in either site would pass every other test here, and
  // tsc, and still silently reintroduce the false "done" this feature
  // exists to remove.
  it('hands the race switcher the open-flag count getRaceProgress reported', async () => {
    setupChecks({
      available: true,
      getRaceProgress: vi.fn(() => ({ checked: 3, total: 3, openFlags: 1, done: false })),
    })
    await act(async () => {
      render(<AppContent settings={testSettings} updateSettings={vi.fn()} />)
    })

    expect(headerProps).not.toBeNull()
    expect((headerProps!.getRaceCheckState as (id: string) => unknown)(RACE_ID)).toEqual({
      checked: 3,
      total: 3,
      openFlags: 1,
    })
  })

  // #131: a race whose rows are not in memory has no progress to report -
  // it must read as "not loaded" (null), not as zero counts that the race
  // switcher cannot tell apart from "nothing verified yet".
  it('reports a race without loaded results as not loaded rather than as zero progress', async () => {
    setupChecks({ available: true })
    await act(async () => {
      render(<AppContent settings={testSettings} updateSettings={vi.fn()} />)
    })

    expect(headerProps).not.toBeNull()
    expect((headerProps!.getRaceCheckState as (id: string) => unknown)('race-never-opened')).toBeNull()
  })

  it('feeds the real openFlags count into the footer progress bar, not a hardcoded value', async () => {
    // Every gate checked (checked === total) but with an open flag - the
    // fully-checked case is exactly where a hardcoded openFlags: 0 would
    // slip through unnoticed and render the bar green.
    setupChecks({
      available: true,
      getRaceProgress: vi.fn(() => ({ checked: 3, total: 3, openFlags: 1, done: false })),
    })
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(<AppContent settings={testSettings} updateSettings={vi.fn()} />)
    })

    // CheckProgress is not mocked in this file (unlike ResultsGrid/Header
    // above), so this exercises the real component against whatever
    // footerProgress actually computed.
    expect(view.getByRole('progressbar')).not.toHaveClass('progress-success')
    expect(view.getByText('3/3')).not.toHaveClass('check-progress__text--complete')
  })
})

describe('AppContent flag submit failure', () => {
  // The bug this pins: a failed submit used to go to console.error while the
  // dialog closed anyway, which on a tablet is indistinguishable from
  // success - the flag stays put and nothing says why. That is how a
  // server-side CORS gap (no PATCH in Access-Control-Allow-Methods,
  // OpenCanoeTiming/c123-server#162) read to an operator as "Resolve does
  // nothing at all".
  const openFlag = {
      "id": "f1",
      "bib": "42",
      "gate": 2,
      "createdAt": "t",
      "comment": "Paper says otherwise",
      "suggestedValue": 2,
      "resolved": false
  }

  async function renderAndOpenResolveDialog() {
    await act(async () => {
      render(<AppContent settings={testSettings} updateSettings={vi.fn()} />)
    })
    await act(async () => {
      ;(gridProps!.onResolveFlag as (flag: typeof openFlag) => void)(openFlag)
    })
  }

  it('keeps the dialog open and names the reason when the request fails', async () => {
    vi.mocked(resolveFlag).mockRejectedValue(new TypeError('Failed to fetch'))

    await renderAndOpenResolveDialog()
    expect(screen.getByRole('heading', { name: 'Resolve flag' })).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    })

    // Still open ...
    expect(screen.getByRole('heading', { name: 'Resolve flag' })).toBeInTheDocument()
    // ... and saying why, without leaking the raw fetch TypeError.
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/Could not reach the server/)
    expect(alert).not.toHaveTextContent(/Failed to fetch/)
  })

  it("surfaces the server's own explanation when it sends one", async () => {
    vi.mocked(resolveFlag).mockRejectedValue(
      new ApiRequestError('Flag not found', 404, 'No flag f1 in race R1')
    )

    await renderAndOpenResolveDialog()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    })

    expect(screen.getByRole('alert')).toHaveTextContent('No flag f1 in race R1')
  })

  it('closes the dialog on success and shows no error', async () => {
    await renderAndOpenResolveDialog()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    })

    expect(screen.queryByRole('heading', { name: 'Resolve flag' })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(vi.mocked(resolveFlag)).toHaveBeenCalledWith(RACE_ID, 'f1', undefined)
  })

  it('does not carry a stale error onto the next flag opened', async () => {
    vi.mocked(resolveFlag).mockRejectedValue(new TypeError('Failed to fetch'))

    await renderAndOpenResolveDialog()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // Operator gives up on this one and opens a different gate's dialog.
    await act(async () => {
      ;(gridProps!.onAddFlag as (bib: string, gate: number) => void)('42', 3)
    })

    expect(screen.getByRole('heading', { name: 'Add flag' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('does not paint a late failure onto a dialog the operator already moved on from', async () => {
    // The request is not cancelled when the dialog closes - fetchWithRetry
    // can still be mid-retry for seconds - so its rejection must prove it is
    // still about what is on screen before it paints anything.
    let rejectResolve: (error: Error) => void = () => {}
    vi.mocked(resolveFlag).mockReturnValue(
      new Promise((_, reject) => {
        rejectResolve = reject
      }) as never
    )

    await renderAndOpenResolveDialog()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    })

    // Operator cancels, then opens a flag on another gate.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    })
    await act(async () => {
      ;(gridProps!.onAddFlag as (bib: string, gate: number) => void)('42', 3)
    })

    // Only now does the abandoned request give up.
    await act(async () => {
      rejectResolve(new TypeError('Failed to fetch'))
    })

    expect(screen.getByRole('heading', { name: 'Add flag' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
