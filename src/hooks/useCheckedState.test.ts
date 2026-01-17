import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCheckedState } from './useCheckedState'

// =============================================================================
// Mock localStorage
// =============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// =============================================================================
// Mock Date for consistent timestamps
// =============================================================================

const mockDate = new Date('2026-01-16T10:00:00.000Z')

// =============================================================================
// Tests
// =============================================================================

describe('useCheckedState', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('starts with empty checked states', () => {
      const { result } = renderHook(() => useCheckedState())

      expect(result.current.checkedStates.size).toBe(0)
    })

    it('isChecked returns false for unchecked competitors', () => {
      const { result } = renderHook(() => useCheckedState())

      expect(result.current.isChecked('10')).toBe(false)
      expect(result.current.isChecked('99')).toBe(false)
    })

    it('getCheckedAt returns null for unchecked competitors', () => {
      const { result } = renderHook(() => useCheckedState())

      expect(result.current.getCheckedAt('10')).toBeNull()
    })
  })

  describe('setChecked', () => {
    it('marks a competitor as checked', () => {
      const { result } = renderHook(() => useCheckedState())

      act(() => {
        result.current.setChecked('10', true)
      })

      expect(result.current.isChecked('10')).toBe(true)
    })

    it('sets the checked timestamp', () => {
      const { result } = renderHook(() => useCheckedState())

      act(() => {
        result.current.setChecked('10', true)
      })

      expect(result.current.getCheckedAt('10')).toBe('2026-01-16T10:00:00.000Z')
    })

    it('marks a competitor as unchecked', () => {
      const { result } = renderHook(() => useCheckedState())

      act(() => {
        result.current.setChecked('10', true)
      })

      act(() => {
        result.current.setChecked('10', false)
      })

      expect(result.current.isChecked('10')).toBe(false)
    })

    it('clears timestamp when unchecking', () => {
      const { result } = renderHook(() => useCheckedState())

      act(() => {
        result.current.setChecked('10', true)
      })

      act(() => {
        result.current.setChecked('10', false)
      })

      expect(result.current.getCheckedAt('10')).toBeNull()
    })
  })

  describe('toggleChecked', () => {
    it('toggles from unchecked to checked', () => {
      const { result } = renderHook(() => useCheckedState())

      expect(result.current.isChecked('10')).toBe(false)

      act(() => {
        result.current.toggleChecked('10')
      })

      expect(result.current.isChecked('10')).toBe(true)
    })

    it('toggles from checked to unchecked', () => {
      const { result } = renderHook(() => useCheckedState())

      act(() => {
        result.current.setChecked('10', true)
      })

      act(() => {
        result.current.toggleChecked('10')
      })

      expect(result.current.isChecked('10')).toBe(false)
    })
  })

  describe('group-scoped checking', () => {
    it('tracks checked state per group', () => {
      const { result: group1 } = renderHook(() =>
        useCheckedState({ groupId: 'group-1' })
      )
      const { result: group2 } = renderHook(() =>
        useCheckedState({ groupId: 'group-2' })
      )

      act(() => {
        group1.current.setChecked('10', true)
      })

      expect(group1.current.isChecked('10')).toBe(true)
      expect(group2.current.isChecked('10')).toBe(false)
    })

    it('uses null groupId for "all gates" checking', () => {
      const { result } = renderHook(() => useCheckedState({ groupId: null }))

      act(() => {
        result.current.setChecked('10', true)
      })

      expect(result.current.isChecked('10')).toBe(true)
    })
  })

  describe('clearChecked', () => {
    it('clears all checked states when groupId is null', () => {
      const { result } = renderHook(() => useCheckedState({ groupId: null }))

      act(() => {
        result.current.setChecked('10', true)
        result.current.setChecked('11', true)
        result.current.setChecked('12', true)
      })

      expect(result.current.checkedStates.size).toBe(3)

      act(() => {
        result.current.clearChecked()
      })

      expect(result.current.checkedStates.size).toBe(0)
    })

    it('clears only group-specific states when groupId is set', () => {
      const { result } = renderHook(() =>
        useCheckedState({ groupId: 'group-1', raceId: 'race-1' })
      )

      // Set up some checked states
      act(() => {
        result.current.setChecked('10', true) // This will be in group-1
      })

      act(() => {
        result.current.clearChecked()
      })

      expect(result.current.isChecked('10')).toBe(false)
    })
  })

  describe('getProgress', () => {
    it('returns zero progress for empty list', () => {
      const { result } = renderHook(() => useCheckedState())

      const progress = result.current.getProgress([])

      expect(progress).toEqual({ checked: 0, total: 0, percentage: 0 })
    })

    it('calculates progress correctly', () => {
      const { result } = renderHook(() => useCheckedState())

      act(() => {
        result.current.setChecked('10', true)
        result.current.setChecked('11', true)
      })

      const progress = result.current.getProgress(['10', '11', '12', '13'])

      expect(progress.checked).toBe(2)
      expect(progress.total).toBe(4)
      expect(progress.percentage).toBe(50)
    })

    it('rounds percentage to nearest integer', () => {
      const { result } = renderHook(() => useCheckedState())

      act(() => {
        result.current.setChecked('10', true)
      })

      const progress = result.current.getProgress(['10', '11', '12'])

      expect(progress.percentage).toBe(33) // 1/3 = 33.33... -> 33
    })

    it('returns 100% when all checked', () => {
      const { result } = renderHook(() => useCheckedState())

      act(() => {
        result.current.setChecked('10', true)
        result.current.setChecked('11', true)
      })

      const progress = result.current.getProgress(['10', '11'])

      expect(progress.percentage).toBe(100)
    })
  })

  describe('checkMultiple', () => {
    it('checks multiple competitors at once', () => {
      const { result } = renderHook(() => useCheckedState())

      act(() => {
        result.current.checkMultiple(['10', '11', '12'])
      })

      expect(result.current.isChecked('10')).toBe(true)
      expect(result.current.isChecked('11')).toBe(true)
      expect(result.current.isChecked('12')).toBe(true)
    })

    it('uses same timestamp for all', () => {
      const { result } = renderHook(() => useCheckedState())

      act(() => {
        result.current.checkMultiple(['10', '11', '12'])
      })

      const ts1 = result.current.getCheckedAt('10')
      const ts2 = result.current.getCheckedAt('11')
      const ts3 = result.current.getCheckedAt('12')

      expect(ts1).toBe(ts2)
      expect(ts2).toBe(ts3)
    })
  })

  describe('uncheckMultiple', () => {
    it('unchecks multiple competitors at once', () => {
      const { result } = renderHook(() => useCheckedState())

      act(() => {
        result.current.checkMultiple(['10', '11', '12', '13'])
      })

      act(() => {
        result.current.uncheckMultiple(['10', '12'])
      })

      expect(result.current.isChecked('10')).toBe(false)
      expect(result.current.isChecked('11')).toBe(true)
      expect(result.current.isChecked('12')).toBe(false)
      expect(result.current.isChecked('13')).toBe(true)
    })
  })

  describe('localStorage persistence', () => {
    it('saves checked states to localStorage', () => {
      const { result } = renderHook(() =>
        useCheckedState({ storageKeyPrefix: 'test-checked' })
      )

      act(() => {
        result.current.setChecked('10', true)
      })

      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('uses different storage key for different race IDs', () => {
      renderHook(() =>
        useCheckedState({ raceId: 'race-1', storageKeyPrefix: 'test' })
      )

      renderHook(() =>
        useCheckedState({ raceId: 'race-2', storageKeyPrefix: 'test' })
      )

      const getItemCalls = localStorageMock.getItem.mock.calls
      expect(getItemCalls.some((call) => call[0] === 'test-race-1')).toBe(true)
      expect(getItemCalls.some((call) => call[0] === 'test-race-2')).toBe(true)
    })

    it('handles invalid localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json {')

      const { result } = renderHook(() =>
        useCheckedState({ storageKeyPrefix: 'test-invalid' })
      )

      expect(result.current.checkedStates.size).toBe(0)
    })

    it('handles old version localStorage data', () => {
      const oldVersionData = {
        version: 0, // Old version
        states: [],
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(oldVersionData))

      const { result } = renderHook(() =>
        useCheckedState({ storageKeyPrefix: 'test-old' })
      )

      expect(result.current.checkedStates.size).toBe(0)
    })
  })
})
