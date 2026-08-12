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
import { render, act } from '@testing-library/react'
import { AppContent } from './App'
import type { Settings } from './hooks/useSettings'
import type { C123ResultsData, C123RaceConfigData } from './types/c123server'

vi.mock('./hooks/useC123WebSocket')
vi.mock('./hooks/useChecks')
vi.mock('./hooks/useScoring')
vi.mock('./hooks/useSchedule')
vi.mock('./hooks/useGateGroups')
vi.mock('./services/scheduleApi')
vi.mock('./services/coursesApi')
vi.mock('./services/resultsApi')

import { useC123WebSocket } from './hooks/useC123WebSocket'
import { useChecks } from './hooks/useChecks'
import { useScoring } from './hooks/useScoring'
import { useSchedule } from './hooks/useSchedule'
import { useGateGroups } from './hooks/useGateGroups'
import { fetchScheduleEnrichment } from './services/scheduleApi'
import { fetchCourses } from './services/coursesApi'
import { fetchRaceResults } from './services/resultsApi'

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
    getRaceProgress: vi.fn(() => ({ checked: 0, total: 0, done: false })),
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
})
