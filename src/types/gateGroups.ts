/**
 * Gate Groups Types and Utilities
 *
 * Types and utilities for gate grouping functionality.
 * Allows judges to work with subsets of gates (e.g., gates 1-4, 5-8).
 * Supports overlapping groups (e.g., judge 1: 1-4, judge 2: 5-8, helper: 4-6).
 */

import type { GateGroup } from './ui'
import { ALL_GATES_GROUP } from './ui'

// Re-export for convenience
export type { GateGroup }
export { ALL_GATES_GROUP }

// =============================================================================
// Gate Groups Configuration
// =============================================================================

/**
 * Configuration for gate groups in a race
 */
export interface GateGroupsConfig {
  /** List of custom gate groups */
  groups: GateGroup[]
  /** ID of the currently active group (null = all gates) */
  activeGroupId: string | null
}

/**
 * Default configuration with no custom groups
 */
export const DEFAULT_GATE_GROUPS_CONFIG: GateGroupsConfig = {
  groups: [],
  activeGroupId: null,
}

// =============================================================================
// Segment-based Groups
// =============================================================================

/**
 * Segment definition from RaceConfig
 * Segments are sections of the course used for split times
 */
export interface CourseSegment {
  /** Segment number (1-based) */
  number: number
  /** Name of the segment */
  name: string
  /** First gate in segment (1-based, inclusive) */
  startGate: number
  /** Last gate in segment (1-based, inclusive) */
  endGate: number
}

/**
 * Default colors for segment groups (distinct from GROUP_COLORS for custom groups)
 */
export const SEGMENT_COLORS = [
  '#0ea5e9', // Sky blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
] as const

/**
 * Create gate groups from course segments
 */
export function createGroupsFromSegments(segments: CourseSegment[]): GateGroup[] {
  return segments.map((segment, index) => ({
    id: `segment-${segment.number}`,
    name: segment.name || `Segment ${segment.number}`,
    gates: createGateRange(segment.startGate, segment.endGate),
    color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
  }))
}

/**
 * Create course segments from split gate numbers
 *
 * Splits are gate numbers where timing checkpoints occur.
 * Each segment runs from the previous split (exclusive) to the current split (inclusive).
 * First segment starts at gate 1.
 *
 * @param splits - Array of gate numbers where splits occur (1-indexed, sorted)
 * @param totalGates - Total number of gates in the course
 * @returns Array of CourseSegment objects
 *
 * @example
 * createSegmentsFromSplits([5, 9, 14], 14)
 * // Returns:
 * // [
 * //   { number: 1, name: "Segment 1", startGate: 1, endGate: 5 },
 * //   { number: 2, name: "Segment 2", startGate: 6, endGate: 9 },
 * //   { number: 3, name: "Segment 3", startGate: 10, endGate: 14 }
 * // ]
 */
export function createSegmentsFromSplits(
  splits: number[],
  totalGates: number
): CourseSegment[] {
  if (splits.length === 0 || totalGates === 0) {
    return []
  }

  // Sort splits to ensure correct order
  const sortedSplits = [...splits].sort((a, b) => a - b)

  const segments: CourseSegment[] = []
  let startGate = 1

  for (let i = 0; i < sortedSplits.length; i++) {
    const endGate = sortedSplits[i]

    // Skip if split is beyond total gates or invalid
    if (endGate > totalGates || endGate < startGate) {
      continue
    }

    segments.push({
      number: segments.length + 1,
      name: `Segment ${segments.length + 1}`,
      startGate,
      endGate,
    })

    startGate = endGate + 1
  }

  // Add final segment if there are gates after the last split
  if (startGate <= totalGates) {
    segments.push({
      number: segments.length + 1,
      name: `Segment ${segments.length + 1}`,
      startGate,
      endGate: totalGates,
    })
  }

  return segments
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a range of gate numbers (1-based, inclusive)
 */
export function createGateRange(start: number, end: number): number[] {
  const gates: number[] = []
  for (let i = start; i <= end; i++) {
    gates.push(i)
  }
  return gates
}

/**
 * Check if a gate number is in a group
 * If group is ALL_GATES_GROUP (empty gates array), returns true
 */
export function isGateInGroup(gateNumber: number, group: GateGroup): boolean {
  if (group.gates.length === 0) {
    return true // ALL_GATES_GROUP or empty = show all
  }
  return group.gates.includes(gateNumber)
}

/**
 * Generate a unique ID for a new gate group
 */
export function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create a new gate group with default values
 */
export function createGateGroup(
  name: string,
  gates: number[],
  color?: string
): GateGroup {
  return {
    id: generateGroupId(),
    name,
    gates: [...gates].sort((a, b) => a - b),
    color,
  }
}

/**
 * Update a gate group in a list
 */
export function updateGateGroup(
  groups: GateGroup[],
  groupId: string,
  updates: Partial<Omit<GateGroup, 'id'>>
): GateGroup[] {
  return groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          ...updates,
          gates: updates.gates
            ? [...updates.gates].sort((a, b) => a - b)
            : group.gates,
        }
      : group
  )
}

/**
 * Remove a gate group from a list
 */
export function removeGateGroup(groups: GateGroup[], groupId: string): GateGroup[] {
  return groups.filter((group) => group.id !== groupId)
}

/**
 * Validate a gate group against the total number of gates
 */
export function validateGateGroup(
  group: GateGroup,
  totalGates: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!group.name.trim()) {
    errors.push('Group name is required')
  }

  if (group.gates.length === 0 && group.id !== 'all') {
    errors.push('Group must include at least one gate')
  }

  const invalidGates = group.gates.filter((g) => g < 1 || g > totalGates)
  if (invalidGates.length > 0) {
    errors.push(`Invalid gate numbers: ${invalidGates.join(', ')}`)
  }

  const uniqueGates = new Set(group.gates)
  if (uniqueGates.size !== group.gates.length) {
    errors.push('Duplicate gate numbers in group')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// =============================================================================
// Predefined Color Palette
// =============================================================================

/**
 * Predefined colors for gate groups
 */
export const GROUP_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
] as const

/**
 * Get the next available color for a new group
 */
export function getNextGroupColor(existingGroups: GateGroup[]): string {
  const usedColors = new Set(existingGroups.map((g) => g.color).filter(Boolean))
  return GROUP_COLORS.find((c) => !usedColors.has(c)) ?? GROUP_COLORS[0]
}
