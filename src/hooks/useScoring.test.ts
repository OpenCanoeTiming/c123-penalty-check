import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScoring } from './useScoring'
import { ScoringApiError } from '../services/scoringApi'

// =============================================================================
// Mocks
// =============================================================================

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { hostname: 'localhost' },
  writable: true,
})

// =============================================================================
// Helper Functions
// =============================================================================

function createSuccessResponse<T>(data: T): Response {
  return {
    ok: true,
    json: () => Promise.resolve(data),
  } as Response
}

function createErrorResponse(status: number, error: string, detail?: string): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error, detail }),
  } as Response
}

// =============================================================================
// Tests
// =============================================================================

describe('useScoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with empty pending operations', () => {
      const { result } = renderHook(() => useScoring())

      expect(result.current.pendingOperations.size).toBe(0)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.lastError).toBeNull()
    })
  })

  describe('setGatePenalty', () => {
    it('sends scoring request to API', async () => {
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({ success: true, bib: '10', gate: 5, value: 2 })
      )

      const { result } = renderHook(() => useScoring())

      let success: boolean = false
      await act(async () => {
        success = await result.current.setGatePenalty('10', 5, 2)
      })

      expect(success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:27123/api/c123/scoring',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bib: '10', gate: 5, value: 2 }),
        })
      )
    })

    it('includes raceId when provided', async () => {
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({ success: true, bib: '10', gate: 5, value: 0 })
      )

      const { result } = renderHook(() => useScoring())

      await act(async () => {
        await result.current.setGatePenalty('10', 5, 0, 'race-123')
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ bib: '10', gate: 5, value: 0, raceId: 'race-123' }),
        })
      )
    })

    it('sets loading state while request is pending', async () => {
      let resolvePromise: (value: Response) => void
      const pendingPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useScoring())

      // Start the request but don't await it
      let promise: Promise<boolean>
      act(() => {
        promise = result.current.setGatePenalty('10', 5, 2)
      })

      // Should be loading
      expect(result.current.isLoading).toBe(true)
      expect(result.current.pendingOperations.size).toBe(1)

      // Resolve the request
      await act(async () => {
        resolvePromise!(createSuccessResponse({ success: true, bib: '10', gate: 5, value: 2 }))
        await promise
      })

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false)
      expect(result.current.pendingOperations.size).toBe(0)
    })

    it('returns false if same gate operation is already pending', async () => {
      let resolvePromise: (value: Response) => void
      const pendingPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useScoring())

      // Start first request
      let firstResult: boolean
      let secondResult: boolean
      act(() => {
        result.current.setGatePenalty('10', 5, 2).then((r) => {
          firstResult = r
        })
      })

      // Try to start second request for same bib+gate
      await act(async () => {
        secondResult = await result.current.setGatePenalty('10', 5, 0)
      })

      // Second should fail immediately
      expect(secondResult!).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Complete the first request
      await act(async () => {
        resolvePromise!(createSuccessResponse({ success: true, bib: '10', gate: 5, value: 2 }))
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(firstResult!).toBe(true)
    })

    it('handles API errors', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(400, 'Invalid bib', 'Bib not found'))

      const { result } = renderHook(() => useScoring())

      let success: boolean = true
      await act(async () => {
        success = await result.current.setGatePenalty('999', 5, 2)
      })

      expect(success).toBe(false)
      expect(result.current.lastError).toBeInstanceOf(ScoringApiError)
      expect(result.current.lastError?.message).toBe('Invalid bib')
      expect(result.current.lastError?.status).toBe(400)
      expect(result.current.lastError?.detail).toBe('Bib not found')
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useScoring())

      let success: boolean = true
      await act(async () => {
        success = await result.current.setGatePenalty('10', 5, 2)
      })

      expect(success).toBe(false)
      expect(result.current.lastError).toBeInstanceOf(ScoringApiError)
    })
  })

  describe('removeFromCourse', () => {
    it('sends remove request to API', async () => {
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({ success: true, bib: '10', reason: 'DNS', position: 1 })
      )

      const { result } = renderHook(() => useScoring())

      let success: boolean = false
      await act(async () => {
        success = await result.current.removeFromCourse('10', 'DNS')
      })

      expect(success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:27123/api/c123/remove-from-course',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ bib: '10', reason: 'DNS', position: 1 }),
        })
      )
    })

    it('handles DNF reason', async () => {
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({ success: true, bib: '15', reason: 'DNF', position: 1 })
      )

      const { result } = renderHook(() => useScoring())

      await act(async () => {
        await result.current.removeFromCourse('15', 'DNF')
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ bib: '15', reason: 'DNF', position: 1 }),
        })
      )
    })

    it('prevents duplicate remove operations', async () => {
      let resolvePromise: (value: Response) => void
      const pendingPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useScoring())

      act(() => {
        result.current.removeFromCourse('10', 'DNS')
      })

      let secondResult: boolean
      await act(async () => {
        secondResult = await result.current.removeFromCourse('10', 'DNF')
      })

      expect(secondResult!).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Cleanup
      await act(async () => {
        resolvePromise!(createSuccessResponse({ success: true, bib: '10', reason: 'DNS', position: 1 }))
        await new Promise((r) => setTimeout(r, 0))
      })
    })
  })

  describe('sendTimingImpulse', () => {
    it('sends timing request to API', async () => {
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({ success: true, bib: '10', channelPosition: 'Start' })
      )

      const { result } = renderHook(() => useScoring())

      let success: boolean = false
      await act(async () => {
        success = await result.current.sendTimingImpulse('10', 'Start')
      })

      expect(success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:27123/api/c123/timing',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ bib: '10', channelPosition: 'Start' }),
        })
      )
    })

    it('handles Finish channel', async () => {
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({ success: true, bib: '10', channelPosition: 'Finish' })
      )

      const { result } = renderHook(() => useScoring())

      await act(async () => {
        await result.current.sendTimingImpulse('10', 'Finish')
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ bib: '10', channelPosition: 'Finish' }),
        })
      )
    })
  })

  describe('isPending', () => {
    it('returns true for pending gate operation', async () => {
      let resolvePromise: (value: Response) => void
      const pendingPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useScoring())

      act(() => {
        result.current.setGatePenalty('10', 5, 2)
      })

      expect(result.current.isPending('10', 5)).toBe(true)
      expect(result.current.isPending('10', 6)).toBe(false)
      expect(result.current.isPending('11', 5)).toBe(false)

      // Cleanup
      await act(async () => {
        resolvePromise!(createSuccessResponse({ success: true, bib: '10', gate: 5, value: 2 }))
        await new Promise((r) => setTimeout(r, 0))
      })
    })

    it('returns true for any pending operation on bib when gate not specified', async () => {
      let resolvePromise: (value: Response) => void
      const pendingPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useScoring())

      act(() => {
        result.current.setGatePenalty('10', 5, 2)
      })

      expect(result.current.isPending('10')).toBe(true)
      expect(result.current.isPending('11')).toBe(false)

      // Cleanup
      await act(async () => {
        resolvePromise!(createSuccessResponse({ success: true, bib: '10', gate: 5, value: 2 }))
        await new Promise((r) => setTimeout(r, 0))
      })
    })

    it('returns false after operation completes', async () => {
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({ success: true, bib: '10', gate: 5, value: 2 })
      )

      const { result } = renderHook(() => useScoring())

      await act(async () => {
        await result.current.setGatePenalty('10', 5, 2)
      })

      expect(result.current.isPending('10', 5)).toBe(false)
      expect(result.current.isPending('10')).toBe(false)
    })
  })

  describe('clearError', () => {
    it('clears the last error', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(400, 'Test error'))

      const { result } = renderHook(() => useScoring())

      await act(async () => {
        await result.current.setGatePenalty('10', 5, 2)
      })

      expect(result.current.lastError).not.toBeNull()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.lastError).toBeNull()
    })
  })

  describe('server URL handling', () => {
    it('uses localStorage server URL when available', async () => {
      // Discovery/settings now store HTTP base URLs (not ws:// URLs)
      localStorageMock.setItem('c123-server-url', 'http://192.168.1.100:27123')
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({ success: true, bib: '10', gate: 5, value: 2 })
      )

      const { result } = renderHook(() => useScoring())

      await act(async () => {
        await result.current.setGatePenalty('10', 5, 2)
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://192.168.1.100:27123/api/c123/scoring',
        expect.any(Object)
      )
    })

    it('falls back to localhost when no server URL stored', async () => {
      // No URL in localStorage — falls back to http://localhost:27123
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({ success: true, bib: '10', gate: 5, value: 2 })
      )

      const { result } = renderHook(() => useScoring())

      await act(async () => {
        await result.current.setGatePenalty('10', 5, 2)
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:27123/api/c123/scoring',
        expect.any(Object)
      )
    })
  })

  describe('multiple concurrent operations', () => {
    it('tracks multiple operations independently', async () => {
      let resolve1: (value: Response) => void
      let resolve2: (value: Response) => void
      const promise1 = new Promise<Response>((r) => { resolve1 = r })
      const promise2 = new Promise<Response>((r) => { resolve2 = r })

      mockFetch
        .mockReturnValueOnce(promise1)
        .mockReturnValueOnce(promise2)

      const { result } = renderHook(() => useScoring())

      // Start two operations
      act(() => {
        result.current.setGatePenalty('10', 1, 2)
        result.current.setGatePenalty('10', 2, 0)
      })

      expect(result.current.pendingOperations.size).toBe(2)
      expect(result.current.isPending('10', 1)).toBe(true)
      expect(result.current.isPending('10', 2)).toBe(true)

      // Complete first operation
      await act(async () => {
        resolve1!(createSuccessResponse({ success: true, bib: '10', gate: 1, value: 2 }))
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(result.current.pendingOperations.size).toBe(1)
      expect(result.current.isPending('10', 1)).toBe(false)
      expect(result.current.isPending('10', 2)).toBe(true)
      expect(result.current.isLoading).toBe(true)

      // Complete second operation
      await act(async () => {
        resolve2!(createSuccessResponse({ success: true, bib: '10', gate: 2, value: 0 }))
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(result.current.pendingOperations.size).toBe(0)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('error handling edge cases', () => {
    it('handles C123 disconnected error (503)', async () => {
      // 503 triggers retry mechanism (MAX_RETRIES = 2, so 3 total attempts)
      mockFetch
        .mockResolvedValueOnce(createErrorResponse(503, 'C123 not connected'))
        .mockResolvedValueOnce(createErrorResponse(503, 'C123 not connected'))
        .mockResolvedValueOnce(createErrorResponse(503, 'C123 not connected'))

      const { result } = renderHook(() => useScoring())

      await act(async () => {
        await result.current.setGatePenalty('10', 5, 2)
      })

      expect(result.current.lastError?.isC123Disconnected).toBe(true)
    })

    it('handles validation error (400)', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(400, 'Invalid gate number'))

      const { result } = renderHook(() => useScoring())

      await act(async () => {
        await result.current.setGatePenalty('10', 99, 2)
      })

      expect(result.current.lastError?.isValidationError).toBe(true)
    })

    it('clears previous error on new successful request', async () => {
      // First request fails
      mockFetch.mockResolvedValueOnce(createErrorResponse(400, 'Error'))

      const { result } = renderHook(() => useScoring())

      await act(async () => {
        await result.current.setGatePenalty('10', 5, 2)
      })

      expect(result.current.lastError).not.toBeNull()

      // Second request succeeds
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({ success: true, bib: '10', gate: 6, value: 0 })
      )

      await act(async () => {
        await result.current.setGatePenalty('10', 6, 0)
      })

      // Error should be cleared when new operation starts
      expect(result.current.lastError).toBeNull()
    })
  })
})
