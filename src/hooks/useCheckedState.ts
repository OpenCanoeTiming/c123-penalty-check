import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CheckedState, CheckProgress } from '../types/scoring'
import { createCheckedKey } from '../types/scoring'

// =============================================================================
// Types
// =============================================================================

export interface UseCheckedStateOptions {
  /** Race ID for localStorage key scoping */
  raceId?: string | null
  /** Gate group ID for per-group checking */
  groupId?: string | null
  /** localStorage key prefix */
  storageKeyPrefix?: string
}

export interface UseCheckedStateReturn {
  /** Map of all checked states */
  checkedStates: Map<string, CheckedState>
  /** Check if a competitor is checked for the current group */
  isChecked: (bib: string) => boolean
  /** Get the checked timestamp for a competitor */
  getCheckedAt: (bib: string) => string | null
  /** Toggle checked state for a competitor */
  toggleChecked: (bib: string) => void
  /** Set checked state for a competitor */
  setChecked: (bib: string, checked: boolean) => void
  /** Clear all checked states for current race/group */
  clearChecked: () => void
  /** Get progress stats for a list of competitors */
  getProgress: (bibs: string[]) => CheckProgress
  /** Check multiple competitors at once */
  checkMultiple: (bibs: string[]) => void
  /** Uncheck multiple competitors at once */
  uncheckMultiple: (bibs: string[]) => void
}

// =============================================================================
// localStorage Helpers
// =============================================================================

const STORAGE_VERSION = 1

interface StoredCheckedData {
  version: number
  states: Array<[string, CheckedState]>
}

function getStorageKey(prefix: string, raceId: string | null): string {
  return raceId ? `${prefix}-${raceId}` : prefix
}

function loadFromStorage(key: string): Map<string, CheckedState> {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return new Map()

    const data: StoredCheckedData = JSON.parse(stored)
    if (data.version !== STORAGE_VERSION) {
      return new Map()
    }

    return new Map(data.states)
  } catch {
    return new Map()
  }
}

function saveToStorage(key: string, states: Map<string, CheckedState>): void {
  try {
    const data: StoredCheckedData = {
      version: STORAGE_VERSION,
      states: Array.from(states.entries()),
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    console.warn('Failed to save checked states to localStorage')
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useCheckedState(options: UseCheckedStateOptions = {}): UseCheckedStateReturn {
  const {
    raceId = null,
    groupId = null,
    storageKeyPrefix = 'c123-scoring-checked',
  } = options

  // Storage key based on race ID only (group filtering happens in memory)
  const storageKey = useMemo(
    () => getStorageKey(storageKeyPrefix, raceId),
    [storageKeyPrefix, raceId]
  )

  // State
  const [checkedStates, setCheckedStates] = useState<Map<string, CheckedState>>(() =>
    loadFromStorage(storageKey)
  )

  // Load from storage when race changes
  useEffect(() => {
    setCheckedStates(loadFromStorage(storageKey))
  }, [storageKey])

  // Save to storage when states change
  useEffect(() => {
    saveToStorage(storageKey, checkedStates)
  }, [storageKey, checkedStates])

  // =============================================================================
  // Actions
  // =============================================================================

  const isChecked = useCallback(
    (bib: string): boolean => {
      const key = createCheckedKey(bib, groupId)
      return checkedStates.get(key)?.checked ?? false
    },
    [checkedStates, groupId]
  )

  const getCheckedAt = useCallback(
    (bib: string): string | null => {
      const key = createCheckedKey(bib, groupId)
      return checkedStates.get(key)?.checkedAt ?? null
    },
    [checkedStates, groupId]
  )

  const setChecked = useCallback(
    (bib: string, checked: boolean) => {
      const key = createCheckedKey(bib, groupId)
      setCheckedStates((prev) => {
        const next = new Map(prev)
        next.set(key, {
          bib,
          groupId,
          checked,
          checkedAt: checked ? new Date().toISOString() : null,
        })
        return next
      })
    },
    [groupId]
  )

  const toggleChecked = useCallback(
    (bib: string) => {
      const currentlyChecked = isChecked(bib)
      setChecked(bib, !currentlyChecked)
    },
    [isChecked, setChecked]
  )

  const clearChecked = useCallback(() => {
    setCheckedStates((prev) => {
      // If groupId is null, clear everything for this race
      // Otherwise, only clear entries for this specific group
      if (groupId === null) {
        return new Map()
      }

      const next = new Map(prev)
      for (const [key, state] of prev) {
        if (state.groupId === groupId) {
          next.delete(key)
        }
      }
      return next
    })
  }, [groupId])

  const getProgress = useCallback(
    (bibs: string[]): CheckProgress => {
      if (bibs.length === 0) {
        return { checked: 0, total: 0, percentage: 0 }
      }

      const checkedCount = bibs.filter((bib) => {
        const key = createCheckedKey(bib, groupId)
        return checkedStates.get(key)?.checked ?? false
      }).length

      return {
        checked: checkedCount,
        total: bibs.length,
        percentage: Math.round((checkedCount / bibs.length) * 100),
      }
    },
    [checkedStates, groupId]
  )

  const checkMultiple = useCallback(
    (bibs: string[]) => {
      setCheckedStates((prev) => {
        const next = new Map(prev)
        const now = new Date().toISOString()
        for (const bib of bibs) {
          const key = createCheckedKey(bib, groupId)
          next.set(key, {
            bib,
            groupId,
            checked: true,
            checkedAt: now,
          })
        }
        return next
      })
    },
    [groupId]
  )

  const uncheckMultiple = useCallback(
    (bibs: string[]) => {
      setCheckedStates((prev) => {
        const next = new Map(prev)
        for (const bib of bibs) {
          const key = createCheckedKey(bib, groupId)
          next.set(key, {
            bib,
            groupId,
            checked: false,
            checkedAt: null,
          })
        }
        return next
      })
    },
    [groupId]
  )

  return {
    checkedStates,
    isChecked,
    getCheckedAt,
    toggleChecked,
    setChecked,
    clearChecked,
    getProgress,
    checkMultiple,
    uncheckMultiple,
  }
}
