import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGateGroups } from './useGateGroups'
import type { C123RaceConfigData } from '../types/c123server'
import { ALL_GATES_GROUP } from '../types/ui'

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
// Test Fixtures
// =============================================================================

const sampleRaceConfig: C123RaceConfigData = {
  nrSplits: 2,
  nrGates: 24,
  gateConfig: 'NNRNNRNRNNNRNNRNRNNRNNRN',
  gateCaptions: '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24',
}

// =============================================================================
// Tests
// =============================================================================

describe('useGateGroups', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns ALL_GATES_GROUP in allGroups', () => {
      const { result } = renderHook(() => useGateGroups())

      expect(result.current.allGroups).toContainEqual(ALL_GATES_GROUP)
      expect(result.current.allGroups[0]).toEqual(ALL_GATES_GROUP)
    })

    it('starts with no active group', () => {
      const { result } = renderHook(() => useGateGroups())

      expect(result.current.activeGroup).toBeNull()
      expect(result.current.activeGroupId).toBeNull()
    })

    it('starts with empty custom groups', () => {
      const { result } = renderHook(() => useGateGroups())

      expect(result.current.customGroups).toEqual([])
    })

    it('starts with empty segment groups (no segments in config)', () => {
      const { result } = renderHook(() => useGateGroups({ raceConfig: sampleRaceConfig }))

      expect(result.current.segmentGroups).toEqual([])
    })

    it('returns totalGates from raceConfig', () => {
      const { result } = renderHook(() => useGateGroups({ raceConfig: sampleRaceConfig }))

      expect(result.current.totalGates).toBe(24)
    })

    it('returns 0 totalGates when no raceConfig', () => {
      const { result } = renderHook(() => useGateGroups())

      expect(result.current.totalGates).toBe(0)
    })
  })

  describe('setActiveGroup', () => {
    it('sets active group by ID', () => {
      const { result } = renderHook(() => useGateGroups())

      // First add a group
      act(() => {
        result.current.addGroup('Test Group', [1, 2, 3])
      })

      const groupId = result.current.customGroups[0].id

      act(() => {
        result.current.setActiveGroup(groupId)
      })

      expect(result.current.activeGroupId).toBe(groupId)
      expect(result.current.activeGroup?.name).toBe('Test Group')
    })

    it('sets active group to ALL_GATES_GROUP', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.setActiveGroup('all')
      })

      expect(result.current.activeGroupId).toBe('all')
      expect(result.current.activeGroup).toEqual(ALL_GATES_GROUP)
    })

    it('sets null when ID is null', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Test', [1])
      })

      const groupId = result.current.customGroups[0].id

      act(() => {
        result.current.setActiveGroup(groupId)
      })

      expect(result.current.activeGroupId).toBe(groupId)

      act(() => {
        result.current.setActiveGroup(null)
      })

      expect(result.current.activeGroupId).toBeNull()
      expect(result.current.activeGroup).toBeNull()
    })
  })

  describe('addGroup', () => {
    it('adds a new custom group', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Gates 1-4', [1, 2, 3, 4])
      })

      expect(result.current.customGroups).toHaveLength(1)
      expect(result.current.customGroups[0].name).toBe('Gates 1-4')
      expect(result.current.customGroups[0].gates).toEqual([1, 2, 3, 4])
    })

    it('returns the created group', () => {
      const { result } = renderHook(() => useGateGroups())

      let createdGroup: ReturnType<typeof result.current.addGroup>

      act(() => {
        createdGroup = result.current.addGroup('New Group', [5, 6])
      })

      expect(createdGroup!.name).toBe('New Group')
      expect(createdGroup!.gates).toEqual([5, 6])
      expect(createdGroup!.id).toBeDefined()
    })

    it('assigns a color when not provided', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Test', [1])
      })

      expect(result.current.customGroups[0].color).toBeDefined()
    })

    it('uses provided color', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Test', [1], '#ff0000')
      })

      expect(result.current.customGroups[0].color).toBe('#ff0000')
    })

    it('sorts gates in ascending order', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Unsorted', [5, 1, 3, 2, 4])
      })

      expect(result.current.customGroups[0].gates).toEqual([1, 2, 3, 4, 5])
    })

    it('adds group to allGroups list', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('New Group', [1, 2, 3])
      })

      expect(result.current.allGroups).toHaveLength(2) // ALL_GATES + new group
      expect(result.current.allGroups[1].name).toBe('New Group')
    })
  })

  describe('updateGroup', () => {
    it('updates group name', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Original', [1, 2])
      })

      const groupId = result.current.customGroups[0].id

      act(() => {
        result.current.updateGroup(groupId, { name: 'Updated' })
      })

      expect(result.current.customGroups[0].name).toBe('Updated')
    })

    it('updates group gates', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Test', [1, 2])
      })

      const groupId = result.current.customGroups[0].id

      act(() => {
        result.current.updateGroup(groupId, { gates: [3, 4, 5] })
      })

      expect(result.current.customGroups[0].gates).toEqual([3, 4, 5])
    })

    it('sorts updated gates', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Test', [1, 2])
      })

      const groupId = result.current.customGroups[0].id

      act(() => {
        result.current.updateGroup(groupId, { gates: [5, 3, 1] })
      })

      expect(result.current.customGroups[0].gates).toEqual([1, 3, 5])
    })

    it('updates group color', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Test', [1])
      })

      const groupId = result.current.customGroups[0].id

      act(() => {
        result.current.updateGroup(groupId, { color: '#00ff00' })
      })

      expect(result.current.customGroups[0].color).toBe('#00ff00')
    })

    it('does nothing for non-existent group', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Test', [1])
      })

      act(() => {
        result.current.updateGroup('non-existent', { name: 'Should Not Work' })
      })

      expect(result.current.customGroups[0].name).toBe('Test')
    })
  })

  describe('removeGroup', () => {
    it('removes a custom group', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Group 1', [1, 2])
        result.current.addGroup('Group 2', [3, 4])
      })

      const groupId = result.current.customGroups[0].id

      act(() => {
        result.current.removeGroup(groupId)
      })

      expect(result.current.customGroups).toHaveLength(1)
      expect(result.current.customGroups[0].name).toBe('Group 2')
    })

    it('resets activeGroupId to null when removing active group', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Active Group', [1])
      })

      const groupId = result.current.customGroups[0].id

      act(() => {
        result.current.setActiveGroup(groupId)
      })

      expect(result.current.activeGroupId).toBe(groupId)

      act(() => {
        result.current.removeGroup(groupId)
      })

      expect(result.current.activeGroupId).toBeNull()
    })

    it('keeps activeGroupId when removing different group', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Group 1', [1])
        result.current.addGroup('Group 2', [2])
      })

      const group1Id = result.current.customGroups[0].id
      const group2Id = result.current.customGroups[1].id

      act(() => {
        result.current.setActiveGroup(group1Id)
      })

      act(() => {
        result.current.removeGroup(group2Id)
      })

      expect(result.current.activeGroupId).toBe(group1Id)
    })
  })

  describe('clearCustomGroups', () => {
    it('removes all custom groups', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Group 1', [1])
        result.current.addGroup('Group 2', [2])
        result.current.addGroup('Group 3', [3])
      })

      expect(result.current.customGroups).toHaveLength(3)

      act(() => {
        result.current.clearCustomGroups()
      })

      expect(result.current.customGroups).toHaveLength(0)
    })

    it('resets activeGroupId when clearing', () => {
      const { result } = renderHook(() => useGateGroups())

      act(() => {
        result.current.addGroup('Test', [1])
      })

      const groupId = result.current.customGroups[0].id

      act(() => {
        result.current.setActiveGroup(groupId)
      })

      act(() => {
        result.current.clearCustomGroups()
      })

      expect(result.current.activeGroupId).toBeNull()
    })
  })

  describe('reset', () => {
    it('resets to default state', () => {
      const { result } = renderHook(() => useGateGroups())

      let groupId = ''

      act(() => {
        const group = result.current.addGroup('Group 1', [1])
        groupId = group.id
      })

      act(() => {
        result.current.setActiveGroup(groupId)
      })

      expect(result.current.customGroups).toHaveLength(1)
      expect(result.current.activeGroupId).toBe(groupId)

      act(() => {
        result.current.reset()
      })

      expect(result.current.customGroups).toEqual([])
      expect(result.current.activeGroupId).toBeNull()
    })
  })

  describe('localStorage persistence', () => {
    it('saves groups to localStorage', () => {
      const { result } = renderHook(() =>
        useGateGroups({ storageKeyPrefix: 'test-groups' })
      )

      act(() => {
        result.current.addGroup('Persisted', [1, 2, 3])
      })

      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('uses different storage key for different race IDs', () => {
      renderHook(() =>
        useGateGroups({ raceId: 'race-1', storageKeyPrefix: 'test' })
      )

      renderHook(() =>
        useGateGroups({ raceId: 'race-2', storageKeyPrefix: 'test' })
      )

      // Check that different keys were used
      const getItemCalls = localStorageMock.getItem.mock.calls
      expect(getItemCalls.some((call) => call[0] === 'test-race-1')).toBe(true)
      expect(getItemCalls.some((call) => call[0] === 'test-race-2')).toBe(true)
    })

    it('handles invalid localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json {')

      const { result } = renderHook(() =>
        useGateGroups({ storageKeyPrefix: 'test-invalid' })
      )

      expect(result.current.customGroups).toEqual([])
    })

    it('handles old version localStorage data', () => {
      const oldVersionData = {
        version: 0, // Old version
        config: { groups: [], activeGroupId: null },
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(oldVersionData))

      const { result } = renderHook(() =>
        useGateGroups({ storageKeyPrefix: 'test-old' })
      )

      // Should return default state
      expect(result.current.customGroups).toEqual([])
    })
  })
})
