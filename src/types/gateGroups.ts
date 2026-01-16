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
 * Create gate groups from course segments
 */
export function createGroupsFromSegments(segments: CourseSegment[]): GateGroup[] {
  return segments.map((segment) => ({
    id: `segment-${segment.number}`,
    name: segment.name || `Segment ${segment.number}`,
    gates: createGateRange(segment.startGate, segment.endGate),
  }))
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
 * Filter gates by a group
 */
export function filterGatesByGroup<T extends { number: number }>(
  gates: T[],
  group: GateGroup | null
): T[] {
  if (!group || group.gates.length === 0) {
    return gates
  }
  return gates.filter((gate) => group.gates.includes(gate.number))
}

/**
 * Check if two groups overlap (share any gates)
 */
export function groupsOverlap(group1: GateGroup, group2: GateGroup): boolean {
  if (group1.gates.length === 0 || group2.gates.length === 0) {
    return true // ALL_GATES overlaps with everything
  }
  return group1.gates.some((gate) => group2.gates.includes(gate))
}

/**
 * Get gates that are in multiple groups
 */
export function findOverlappingGates(groups: GateGroup[]): number[] {
  const gateCounts = new Map<number, number>()

  for (const group of groups) {
    if (group.gates.length === 0) continue // Skip ALL_GATES
    for (const gate of group.gates) {
      gateCounts.set(gate, (gateCounts.get(gate) ?? 0) + 1)
    }
  }

  const overlapping: number[] = []
  for (const [gate, count] of gateCounts) {
    if (count > 1) {
      overlapping.push(gate)
    }
  }

  return overlapping.sort((a, b) => a - b)
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
