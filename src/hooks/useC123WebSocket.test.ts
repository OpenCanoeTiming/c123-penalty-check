import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useC123WebSocket } from './useC123WebSocket'
import type {
  C123ConnectedMessage,
  C123OnCourseMessage,
  C123ResultsMessage,
  C123RaceConfigMessage,
  C123ScheduleMessage,
  C123ErrorMessage,
  C123ForceRefreshMessage,
} from '../types/c123server'

// =============================================================================
// Mock WebSocket
// =============================================================================

class MockWebSocket {
  // WebSocket ready state constants (must be defined for guards to work)
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  static instances: MockWebSocket[] = []

  url: string
  readyState: number = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }

  // Helper methods for testing
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN
    if (this.onopen) {
      this.onopen(new Event('open'))
    }
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }

  static reset() {
    MockWebSocket.instances = []
  }

  static getLastInstance(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1]
  }
}

// =============================================================================
// Test Fixtures
// =============================================================================

const createConnectedMessage = (
  overrides: Partial<C123ConnectedMessage['data']> = {}
): C123ConnectedMessage => ({
  type: 'Connected',
  timestamp: new Date().toISOString(),
  data: {
    version: '1.0.0',
    c123Connected: true,
    xmlLoaded: true,
    ...overrides,
  },
})

const createOnCourseMessage = (
  overrides: Partial<C123OnCourseMessage['data']> = {}
): C123OnCourseMessage => ({
  type: 'OnCourse',
  timestamp: new Date().toISOString(),
  data: {
    total: 1,
    competitors: [
      {
        bib: '10',
        name: 'Test Competitor',
        club: 'Test Club',
        nat: 'CZE',
        raceId: 'race-001',
        raceName: 'K1M',
        startOrder: 1,
        warning: '',
        gates: '0,0,2,0',
        completed: false,
        dtStart: '10:00:00.000',
        dtFinish: null,
        pen: 2,
        time: '60.00',
        total: '62.00',
        ttbDiff: '',
        ttbName: '',
        rank: 1,
        position: 1,
      },
    ],
    ...overrides,
  },
})

const createResultsMessage = (
  overrides: Partial<C123ResultsMessage['data']> = {}
): C123ResultsMessage => ({
  type: 'Results',
  timestamp: new Date().toISOString(),
  data: {
    raceId: 'race-001',
    classId: 'K1M',
    isCurrent: true,
    mainTitle: 'K1m',
    subTitle: '1st Run',
    rows: [
      {
        rank: 1,
        bib: '10',
        name: 'Test Competitor',
        givenName: 'Test',
        familyName: 'Competitor',
        club: 'Test Club',
        nat: 'CZE',
        startOrder: 1,
        startTime: '10:00:00',
        gates: '0 0 2 0',
        pen: 2,
        time: '60.00',
        total: '62.00',
        behind: '',
      },
    ],
    ...overrides,
  },
})

const createRaceConfigMessage = (
  overrides: Partial<C123RaceConfigMessage['data']> = {}
): C123RaceConfigMessage => ({
  type: 'RaceConfig',
  timestamp: new Date().toISOString(),
  data: {
    nrSplits: 0,
    nrGates: 24,
    gateConfig: 'NNRNNRNRNNNRNNRNRNNRNNRN',
    gateCaptions: '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24',
    ...overrides,
  },
})

const createScheduleMessage = (
  overrides: Partial<C123ScheduleMessage['data']> = {}
): C123ScheduleMessage => ({
  type: 'Schedule',
  timestamp: new Date().toISOString(),
  data: {
    races: [
      {
        order: 1,
        raceId: 'race-001',
        race: 'K1M_1',
        mainTitle: 'K1m',
        subTitle: '1st Run',
        shortTitle: 'K1m - 1. jízda',
        raceStatus: 3,
        startTime: '10:00:00',
      },
    ],
    ...overrides,
  },
})

const createErrorMessage = (
  overrides: Partial<C123ErrorMessage['data']> = {}
): C123ErrorMessage => ({
  type: 'Error',
  timestamp: new Date().toISOString(),
  data: {
    code: 'ERR_001',
    message: 'Test error message',
    ...overrides,
  },
})

const createForceRefreshMessage = (
  overrides: Partial<C123ForceRefreshMessage['data']> = {}
): C123ForceRefreshMessage => ({
  type: 'ForceRefresh',
  timestamp: new Date().toISOString(),
  data: {
    reason: 'Test refresh',
    ...overrides,
  },
})

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Flush all pending promises (microtasks).
 */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * Helper to render hook and flush effects.
 * With fake timers, React effects don't run synchronously.
 * This ensures the useEffect that calls connect() has executed.
 */
async function renderHookAsync<T>(
  renderCallback: () => T
): Promise<ReturnType<typeof renderHook<T, unknown>>> {
  const result = renderHook(renderCallback)
  // Flush React effects - need multiple rounds for React 18 batching
  await act(async () => {
    await vi.runAllTimersAsync()
    await flushPromises()
  })
  return result
}

// =============================================================================
// Tests
// =============================================================================

describe('useC123WebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    MockWebSocket.reset()
    // Replace global WebSocket with mock
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('initial state', () => {
    it('starts with disconnected state when autoConnect is false', () => {
      const { result } = renderHook(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws', autoConnect: false })
      )

      expect(result.current.connectionState).toBe('disconnected')
      expect(result.current.isConnected).toBe(false)
      expect(result.current.serverInfo).toBeNull()
      expect(result.current.onCourse).toBeNull()
      expect(result.current.results.size).toBe(0)
      expect(result.current.raceConfig).toBeNull()
      expect(result.current.schedule).toBeNull()
      expect(result.current.lastError).toBeNull()
    })

    it('starts connecting when autoConnect is true (default)', async () => {
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      expect(result.current.connectionState).toBe('connecting')
      expect(MockWebSocket.instances.length).toBe(1)
    })
  })

  describe('connection lifecycle', () => {
    it('sets state to connected when receiving Connected message', async () => {
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      const ws = MockWebSocket.getLastInstance()!

      act(() => {
        ws.simulateOpen()
        ws.simulateMessage(createConnectedMessage())
      })

      expect(result.current.connectionState).toBe('connected')
      expect(result.current.isConnected).toBe(true)
      expect(result.current.serverInfo).toEqual({
        version: '1.0.0',
        c123Connected: true,
        xmlLoaded: true,
      })
    })

    it('disconnect() closes the WebSocket and stops reconnect', async () => {
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      const ws = MockWebSocket.getLastInstance()!

      act(() => {
        ws.simulateOpen()
        ws.simulateMessage(createConnectedMessage())
      })

      expect(result.current.isConnected).toBe(true)

      act(() => {
        result.current.disconnect()
      })

      expect(result.current.connectionState).toBe('disconnected')
      expect(result.current.isConnected).toBe(false)

      // Advance timers - should not reconnect
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000)
      })

      // Should not have created new WebSocket instances
      expect(MockWebSocket.instances.length).toBe(1)
    })

    it('connect() can be called manually after disconnect', async () => {
      const { result } = renderHook(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws', autoConnect: false })
      )

      expect(result.current.connectionState).toBe('disconnected')
      expect(MockWebSocket.instances.length).toBe(0)

      await act(async () => {
        result.current.connect()
        await vi.advanceTimersByTimeAsync(0)
      })

      expect(result.current.connectionState).toBe('connecting')
      expect(MockWebSocket.instances.length).toBe(1)
    })
  })

  describe('message handling', () => {
    it('handles OnCourse messages', async () => {
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      const ws = MockWebSocket.getLastInstance()!

      act(() => {
        ws.simulateOpen()
        ws.simulateMessage(createConnectedMessage())
        ws.simulateMessage(createOnCourseMessage())
      })

      expect(result.current.onCourse).not.toBeNull()
      expect(result.current.onCourse!.total).toBe(1)
      expect(result.current.onCourse!.competitors[0].bib).toBe('10')
    })

    it('handles Results messages and stores by raceId', async () => {
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      const ws = MockWebSocket.getLastInstance()!

      act(() => {
        ws.simulateOpen()
        ws.simulateMessage(createConnectedMessage())
        ws.simulateMessage(createResultsMessage({ raceId: 'race-001' }))
        ws.simulateMessage(createResultsMessage({ raceId: 'race-002', mainTitle: 'C1m' }))
      })

      expect(result.current.results.size).toBe(2)
      expect(result.current.results.get('race-001')!.mainTitle).toBe('K1m')
      expect(result.current.results.get('race-002')!.mainTitle).toBe('C1m')
    })

    it('handles RaceConfig messages', async () => {
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      const ws = MockWebSocket.getLastInstance()!

      act(() => {
        ws.simulateOpen()
        ws.simulateMessage(createConnectedMessage())
        ws.simulateMessage(createRaceConfigMessage())
      })

      expect(result.current.raceConfig).not.toBeNull()
      expect(result.current.raceConfig!.nrGates).toBe(24)
      expect(result.current.raceConfig!.gateConfig).toBe('NNRNNRNRNNNRNNRNRNNRNNRN')
    })

    it('handles Schedule messages', async () => {
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      const ws = MockWebSocket.getLastInstance()!

      act(() => {
        ws.simulateOpen()
        ws.simulateMessage(createConnectedMessage())
        ws.simulateMessage(createScheduleMessage())
      })

      expect(result.current.schedule).not.toBeNull()
      expect(result.current.schedule!.races.length).toBe(1)
      expect(result.current.schedule!.races[0].raceId).toBe('race-001')
    })

    it('handles Error messages', async () => {
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      const ws = MockWebSocket.getLastInstance()!

      act(() => {
        ws.simulateOpen()
        ws.simulateMessage(createConnectedMessage())
        ws.simulateMessage(createErrorMessage({ message: 'Something went wrong' }))
      })

      expect(result.current.lastError).toBe('Something went wrong')
    })

    it('handles ForceRefresh messages by clearing cached data', async () => {
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      const ws = MockWebSocket.getLastInstance()!

      // First populate with data
      act(() => {
        ws.simulateOpen()
        ws.simulateMessage(createConnectedMessage())
        ws.simulateMessage(createOnCourseMessage())
        ws.simulateMessage(createResultsMessage())
        ws.simulateMessage(createRaceConfigMessage())
      })

      expect(result.current.onCourse).not.toBeNull()
      expect(result.current.results.size).toBe(1)
      expect(result.current.raceConfig).not.toBeNull()

      // Force refresh should clear data
      act(() => {
        ws.simulateMessage(createForceRefreshMessage())
      })

      expect(result.current.onCourse).toBeNull()
      expect(result.current.results.size).toBe(0)
      expect(result.current.raceConfig).toBeNull()
    })

    it('updates lastMessageTime on each message', async () => {
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      const ws = MockWebSocket.getLastInstance()!

      expect(result.current.lastMessageTime).toBeNull()

      act(() => {
        ws.simulateOpen()
        ws.simulateMessage(createConnectedMessage())
      })

      expect(result.current.lastMessageTime).not.toBeNull()
    })

    it('handles malformed JSON gracefully without crashing', async () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      const ws = MockWebSocket.getLastInstance()!

      // Simulate open first
      act(() => {
        ws.simulateOpen()
        ws.simulateMessage(createConnectedMessage())
      })

      expect(result.current.isConnected).toBe(true)

      // Now send malformed JSON - should not crash
      act(() => {
        if (ws.onmessage) {
          ws.onmessage(new MessageEvent('message', { data: 'not valid json {{{' }))
        }
      })

      // Hook should still be connected, not crashed
      expect(result.current.isConnected).toBe(true)

      consoleSpy.mockRestore()
    })
  })

  describe('check and flag events', () => {
    it('dispatches ChecksChanged events before the state update, not inside it', async () => {
      const onChecksChanged = vi.fn()
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws', onChecksChanged })
      )

      const ws = MockWebSocket.getLastInstance()!

      act(() => {
        ws.simulateOpen()
        ws.simulateMessage({
          type: 'ChecksChanged',
          timestamp: '2026-08-03T10:00:00.000Z',
          data: {
            event: 'check-set',
            raceId: 'K1M_BR1',
            bib: '42',
            gate: 5,
            check: { checkedAt: '2026-08-03T10:00:00.000Z', value: 2 },
          },
        })
      })

      expect(onChecksChanged).toHaveBeenCalledTimes(1)
      expect(onChecksChanged).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'check-set', bib: '42', gate: 5 })
      )
      // lastMessageTime is stamped unconditionally on the first line of the
      // setState updater in handleMessage. It staying null here is what
      // actually proves this event took the early-return path and never
      // reached setState — do not "helpfully" make ChecksChanged update
      // this field, that would silently disarm the check.
      expect(result.current.lastMessageTime).toBeNull()
    })

    it('dispatches FlagChanged events before the state update, not inside it', async () => {
      const onFlagChanged = vi.fn()
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws', onFlagChanged })
      )

      const ws = MockWebSocket.getLastInstance()!

      act(() => {
        ws.simulateOpen()
        ws.simulateMessage({
          type: 'FlagChanged',
          timestamp: '2026-08-03T10:00:00.000Z',
          data: {
            event: 'flag-created',
            raceId: 'K1M_BR1',
            flag: {
              id: 'f1', bib: '42', gate: 7, createdAt: '2026-08-03T10:00:00.000Z',
              comment: 'disputed', resolved: false,
            },
          },
        })
      })

      expect(onFlagChanged).toHaveBeenCalledTimes(1)
      // Check events are a stream, not a snapshot: they must not land in the
      // hook's cached race data. Note results/onCourse alone don't prove
      // placement — they'd stay empty even if this were wrongly folded into
      // setState, since nothing writes flag data into them either way.
      expect(result.current.results.size).toBe(0)
      expect(result.current.onCourse).toBeNull()
      // lastMessageTime is stamped unconditionally on the first line of the
      // setState updater in handleMessage. It staying null here is the real
      // discriminator: it fails if the dispatch is ever moved inside that
      // updater. Do not "helpfully" make FlagChanged update this field,
      // that would silently disarm the check.
      expect(result.current.lastMessageTime).toBeNull()
    })
  })

  describe('error handling', () => {
    it('sets error state on WebSocket error', async () => {
      const { result } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      const ws = MockWebSocket.getLastInstance()!

      act(() => {
        ws.simulateError()
      })

      expect(result.current.connectionState).toBe('error')
      expect(result.current.lastError).toBe('WebSocket connection error')
    })
  })

  describe('URL changes', () => {
    it('reconnects when URL changes', async () => {
      const { rerender } = renderHook(
        ({ url }: { url: string }) => useC123WebSocket({ url }),
        { initialProps: { url: 'ws://localhost:27123/ws' } }
      )

      // Flush initial effects
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })

      expect(MockWebSocket.instances.length).toBe(1)
      expect(MockWebSocket.getLastInstance()!.url).toBe('ws://localhost:27123/ws')

      // Rerender with new URL
      await act(async () => {
        rerender({ url: 'ws://192.168.1.100:27123/ws' })
        await vi.advanceTimersByTimeAsync(0)
      })

      expect(MockWebSocket.instances.length).toBe(2)
      expect(MockWebSocket.getLastInstance()!.url).toBe('ws://192.168.1.100:27123/ws')
    })
  })

  describe('cleanup', () => {
    it('closes WebSocket on unmount', async () => {
      const { unmount } = await renderHookAsync(() =>
        useC123WebSocket({ url: 'ws://localhost:27123/ws' })
      )

      const ws = MockWebSocket.getLastInstance()!

      act(() => {
        ws.simulateOpen()
        ws.simulateMessage(createConnectedMessage())
      })

      expect(ws.readyState).toBe(WebSocket.OPEN)

      unmount()

      expect(ws.readyState).toBe(WebSocket.CLOSED)
    })

    it('clears reconnect timeout on unmount', async () => {
      const { unmount } = await renderHookAsync(() =>
        useC123WebSocket({
          url: 'ws://localhost:27123/ws',
          reconnectInterval: 1000,
        })
      )

      // Close to trigger reconnect timer
      act(() => {
        MockWebSocket.getLastInstance()!.simulateClose()
      })

      unmount()

      // Advance timer - should not create new connections
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })

      expect(MockWebSocket.instances.length).toBe(1)
    })
  })
})
