import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GateGroup } from '../types/ui'
import { ALL_GATES_GROUP } from '../types/ui'
import type { C123RaceConfigData } from '../types/c123server'
import {
  type GateGroupsConfig,
  DEFAULT_GATE_GROUPS_CONFIG,
  type CourseSegment,
  createGroupsFromSegments,
  createGateGroup,
  updateGateGroup as updateGateGroupUtil,
  removeGateGroup as removeGateGroupUtil,
  getNextGroupColor,
} from '../types/gateGroups'

// =============================================================================
// Types
// =============================================================================

export interface UseGateGroupsOptions {
  /** Race config to extract segments from (optional) */
  raceConfig?: C123RaceConfigData | null
  /** Race ID for localStorage key scoping */
  raceId?: string | null
  /** localStorage key prefix */
  storageKeyPrefix?: string
}

export interface UseGateGroupsReturn {
  /** All available groups (segments + custom) */
  allGroups: GateGroup[]
  /** Segment-based groups from race config */
  segmentGroups: GateGroup[]
  /** User-defined custom groups */
  customGroups: GateGroup[]
  /** Currently active group (null = all gates) */
  activeGroup: GateGroup | null
  /** Active group ID */
  activeGroupId: string | null
  /** Total number of gates in the race */
  totalGates: number

  // Actions
  /** Set the active group by ID */
  setActiveGroup: (groupId: string | null) => void
  /** Add a new custom group */
  addGroup: (name: string, gates: number[], color?: string) => GateGroup
  /** Update an existing custom group */
  updateGroup: (groupId: string, updates: Partial<Omit<GateGroup, 'id'>>) => void
  /** Remove a custom group */
  removeGroup: (groupId: string) => void
  /** Clear all custom groups */
  clearCustomGroups: () => void
  /** Reset to default state (all gates) */
  reset: () => void
}

// =============================================================================
// localStorage Helpers
// =============================================================================

const STORAGE_VERSION = 1

interface StoredGateGroupsData {
  version: number
  config: GateGroupsConfig
}

function getStorageKey(prefix: string, raceId: string | null): string {
  return raceId ? `${prefix}-${raceId}` : prefix
}

function loadFromStorage(key: string): GateGroupsConfig {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return DEFAULT_GATE_GROUPS_CONFIG

    const data: StoredGateGroupsData = JSON.parse(stored)
    if (data.version !== STORAGE_VERSION) {
      // Migration could be done here if needed
      return DEFAULT_GATE_GROUPS_CONFIG
    }

    return data.config
  } catch {
    return DEFAULT_GATE_GROUPS_CONFIG
  }
}

function saveToStorage(key: string, config: GateGroupsConfig): void {
  try {
    const data: StoredGateGroupsData = {
      version: STORAGE_VERSION,
      config,
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // localStorage might be full or disabled
    console.warn('Failed to save gate groups to localStorage')
  }
}

// =============================================================================
// Segment Parsing
// =============================================================================

/**
 * Parse segments from race config
 * Currently C123 doesn't provide segment info directly,
 * but this is prepared for future expansion
 */
function parseSegmentsFromConfig(
  _raceConfig: C123RaceConfigData | null | undefined
): CourseSegment[] {
  // TODO: When c123-server provides segment data, parse it here
  // For now, return empty array (no auto-segments)
  return []
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useGateGroups(options: UseGateGroupsOptions = {}): UseGateGroupsReturn {
  const {
    raceConfig = null,
    raceId = null,
    storageKeyPrefix = 'c123-scoring-gate-groups',
  } = options

  // Storage key based on race ID
  const storageKey = useMemo(
    () => getStorageKey(storageKeyPrefix, raceId),
    [storageKeyPrefix, raceId]
  )

  // State
  const [config, setConfig] = useState<GateGroupsConfig>(() =>
    loadFromStorage(storageKey)
  )

  // Load from storage when race changes
  useEffect(() => {
    setConfig(loadFromStorage(storageKey))
  }, [storageKey])

  // Save to storage when config changes
  useEffect(() => {
    saveToStorage(storageKey, config)
  }, [storageKey, config])

  // Parse segments from race config
  const segments = useMemo(() => parseSegmentsFromConfig(raceConfig), [raceConfig])

  // Create segment-based groups
  const segmentGroups = useMemo(() => createGroupsFromSegments(segments), [segments])

  // Total gates from race config
  const totalGates = raceConfig?.nrGates ?? 0

  // All groups: ALL_GATES + segments + custom
  const allGroups = useMemo(
    () => [ALL_GATES_GROUP, ...segmentGroups, ...config.groups],
    [segmentGroups, config.groups]
  )

  // Find active group
  const activeGroup = useMemo(() => {
    if (!config.activeGroupId) return null
    return allGroups.find((g) => g.id === config.activeGroupId) ?? null
  }, [allGroups, config.activeGroupId])

  // =============================================================================
  // Actions
  // =============================================================================

  const setActiveGroup = useCallback((groupId: string | null) => {
    setConfig((prev) => ({
      ...prev,
      activeGroupId: groupId,
    }))
  }, [])

  const addGroup = useCallback(
    (name: string, gates: number[], color?: string): GateGroup => {
      const newGroup = createGateGroup(
        name,
        gates,
        color ?? getNextGroupColor(config.groups)
      )

      setConfig((prev) => ({
        ...prev,
        groups: [...prev.groups, newGroup],
      }))

      return newGroup
    },
    [config.groups]
  )

  const updateGroup = useCallback(
    (groupId: string, updates: Partial<Omit<GateGroup, 'id'>>) => {
      setConfig((prev) => ({
        ...prev,
        groups: updateGateGroupUtil(prev.groups, groupId, updates),
      }))
    },
    []
  )

  const removeGroup = useCallback((groupId: string) => {
    setConfig((prev) => ({
      ...prev,
      groups: removeGateGroupUtil(prev.groups, groupId),
      // If removing active group, reset to all gates
      activeGroupId: prev.activeGroupId === groupId ? null : prev.activeGroupId,
    }))
  }, [])

  const clearCustomGroups = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      groups: [],
      activeGroupId:
        prev.activeGroupId && !segmentGroups.some((g) => g.id === prev.activeGroupId)
          ? null
          : prev.activeGroupId,
    }))
  }, [segmentGroups])

  const reset = useCallback(() => {
    setConfig(DEFAULT_GATE_GROUPS_CONFIG)
  }, [])

  return {
    allGroups,
    segmentGroups,
    customGroups: config.groups,
    activeGroup,
    activeGroupId: config.activeGroupId,
    totalGates,

    setActiveGroup,
    addGroup,
    updateGroup,
    removeGroup,
    clearCustomGroups,
    reset,
  }
}
