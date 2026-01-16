/**
 * UI State Types
 *
 * Types for UI components, grid state, and user interactions.
 */

// =============================================================================
// Focus and Navigation
// =============================================================================

/**
 * Position of focus within the penalty grid
 */
export interface FocusPosition {
  /** Row index (0-based, corresponds to competitor) */
  row: number
  /** Column index (0-based, corresponds to gate) */
  column: number
}

/**
 * Navigation direction for keyboard controls
 */
export type NavigationDirection = 'up' | 'down' | 'left' | 'right'

// =============================================================================
// Grid Cell State
// =============================================================================

/**
 * State of a single cell in the penalty grid
 */
export interface GridCellState {
  /** Whether the cell is currently focused */
  focused: boolean
  /** Whether the cell is being edited */
  editing: boolean
  /** Whether the cell has pending changes (optimistic update) */
  pending: boolean
  /** Whether the cell has an error */
  error: boolean
}

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
// Selection State
// =============================================================================

/**
 * Current selection state in the UI
 */
export interface SelectionState {
  /** Currently selected race ID */
  raceId: string | null
  /** Currently selected gate group */
  gateGroup: GateGroup | null
  /** Current focus position in the grid */
  focus: FocusPosition | null
}

// =============================================================================
// View Modes
// =============================================================================

/**
 * Different view modes for the penalty grid
 */
export type ViewMode =
  | 'compact' // Minimal info, max density
  | 'standard' // Normal view with all info
  | 'expanded' // Large cells for touch/accessibility

// =============================================================================
// Sort and Filter
// =============================================================================

/**
 * Sort options for the competitor list
 */
export type SortField = 'startOrder' | 'bib' | 'name' | 'state' | 'time'

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Filter options for the competitor list
 */
export interface FilterOptions {
  /** Show only competitors in specific states */
  states?: ('waiting' | 'onCourse' | 'finished' | 'checked')[]
  /** Show only unchecked competitors */
  uncheckedOnly?: boolean
  /** Search by name or bib */
  search?: string
}

// =============================================================================
// Modal State
// =============================================================================

/**
 * Types of modals in the application
 */
export type ModalType =
  | 'settings'
  | 'gateGroups'
  | 'keyboardHelp'
  | 'confirmAction'
  | null

/**
 * Modal state
 */
export interface ModalState {
  type: ModalType
  data?: unknown
}

// =============================================================================
// Notification
// =============================================================================

/**
 * Notification/toast types
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/**
 * Notification to display to user
 */
export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number // ms, undefined = sticky
}
