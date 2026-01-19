/**
 * UI State Types
 *
 * Types for UI components, grid state, and user interactions.
 */

// =============================================================================
// Gate Groups
// =============================================================================

/**
 * A named group of gates for filtering
 * Used by judges who only control certain gates
 */
export interface GateGroup {
  /** Unique identifier */
  id: string
  /** Display name (e.g., "Judge 1", "Gates 1-6") */
  name: string
  /** Gate numbers included in this group (1-based) */
  gates: number[]
  /** Color for visual distinction (optional) */
  color?: string
}

/**
 * Default gate group that shows all gates
 */
export const ALL_GATES_GROUP: GateGroup = {
  id: 'all',
  name: 'All Gates',
  gates: [],
}

// =============================================================================
// Sort Options
// =============================================================================

/**
 * Sort options for the results grid
 */
export type ResultsSortOption = 'startOrder' | 'rank' | 'bib'

/**
 * Labels for sort options
 */
export const RESULTS_SORT_LABELS: Record<ResultsSortOption, string> = {
  startOrder: 'Start Order',
  rank: 'Results',
  bib: 'Bib Number',
}
