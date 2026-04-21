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
import { fetchCourses, type CourseConfig } from '../services/coursesApi'

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
  /** Segment-based groups from course splits */
  segmentGroups: GateGroup[]
  /** User-defined custom groups */
  customGroups: GateGroup[]
  /** Currently active group (null = all gates) */
  activeGroup: GateGroup | null
  /** Active group ID */
  activeGroupId: string | null
  /** Total number of gates in the race */
  totalGates: number
  /** Available courses from XML data */
  availableCourses: CourseConfig[]
  /** Whether courses are loading */
  coursesLoading: boolean

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
  /** Reload courses from server */
  reloadCourses: () => void
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
 * Create segments from course data splits
 * CourseConfig does not expose splits, so this always returns empty.
 */
function createSegmentsFromCourse(
  _course?: CourseConfig,
  _totalGates?: number
): CourseSegment[] {
  // CourseConfig does not expose splits, so this always returns empty.
  // Placeholder for future enhancement when splits are available.
  void _course
  void _totalGates
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
  const [courses, setCourses] = useState<CourseConfig[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)

  // Load from storage when race changes
  useEffect(() => {
    setConfig(loadFromStorage(storageKey))
  }, [storageKey])

  // Save to storage when config changes
  useEffect(() => {
    saveToStorage(storageKey, config)
  }, [storageKey, config])

  // Fetch courses from server
  const loadCourses = useCallback(async () => {
    setCoursesLoading(true)
    try {
      const courseMap = await fetchCourses()
      setCourses(Array.from(courseMap.values()))
    } catch {
      setCourses([])
    } finally {
      setCoursesLoading(false)
    }
  }, [])

  // Load courses on mount and when race changes
  useEffect(() => {
    loadCourses()
  }, [loadCourses, raceId])

  // Total gates from race config
  const totalGates = raceConfig?.nrGates ?? 0

  // Find the matching course by comparing gateConfig.
  // CourseConfig.gateConfig already has S markers removed, so compare directly.
  const selectedCourse = useMemo(() => {
    if (!raceConfig?.gateConfig || courses.length === 0) {
      return undefined
    }
    return courses.find((c) => c.gateConfig === raceConfig.gateConfig)
  }, [courses, raceConfig?.gateConfig])

  // Create segments from course splits
  const segments = useMemo(
    () => createSegmentsFromCourse(selectedCourse, totalGates),
    [selectedCourse, totalGates]
  )

  // Create segment-based groups
  const segmentGroups = useMemo(() => createGroupsFromSegments(segments), [segments])

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
    availableCourses: courses,
    coursesLoading,

    setActiveGroup,
    addGroup,
    updateGroup,
    removeGroup,
    clearCustomGroups,
    reset,
    reloadCourses: loadCourses,
  }
}
