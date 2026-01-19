/**
 * Scoring-specific Types
 *
 * Types for scoring operations, penalty values, and competitor states.
 */

// =============================================================================
// Penalty Values
// =============================================================================

/**
 * Valid penalty values in slalom
 * - 0: Clean pass
 * - 2: Touch (2 seconds)
 * - 50: Missed gate (50 seconds)
 * - null: Delete penalty (empty cell)
 */
export type PenaltyValue = 0 | 2 | 50 | null

// =============================================================================
// REST API Request Types
// =============================================================================

/**
 * Request to set a penalty for a gate
 * POST /api/c123/scoring
 */
export interface ScoringRequest {
  /** Race ID - required for finished competitors (e.g. "K1M_ST_BR2_6") */
  raceId?: string
  /** Competitor start number */
  bib: string
  /** Gate number (1-24) */
  gate: number
  /** Penalty value: 0 (clean), 2 (touch), 50 (missed), null (delete) */
  value: PenaltyValue
}

/**
 * Reasons for removing a competitor from course
 */
export type RemoveReason = 'DNS' | 'DNF' | 'DSQ' | 'CAP'

/**
 * Request to remove a competitor from course
 * POST /api/c123/remove-from-course
 */
export interface RemoveFromCourseRequest {
  bib: string
  reason: RemoveReason
}

/**
 * Channel positions for manual timing
 */
export type ChannelPosition = 'Start' | 'Finish' | 'Split1' | 'Split2' | 'Split3'

/**
 * Request to send manual timing impulse
 * POST /api/c123/timing
 */
export interface TimingRequest {
  bib: string
  channelPosition: ChannelPosition
}

// =============================================================================
// Protocol Check Types
// =============================================================================

/**
 * Checked state for a competitor within a specific gate group
 */
export interface CheckedState {
  /** Competitor bib number */
  bib: string
  /** Gate group ID (null = all gates) */
  groupId: string | null
  /** Whether the protocol has been checked */
  checked: boolean
  /** Timestamp when checked (ISO string) */
  checkedAt: string | null
}

/**
 * Create a unique key for the checked state map
 */
export function createCheckedKey(bib: string, groupId: string | null): string {
  return `${bib}:${groupId ?? 'all'}`
}

/**
 * Progress statistics for protocol checking
 */
export interface CheckProgress {
  /** Number of checked competitors */
  checked: number
  /** Total number of competitors to check */
  total: number
  /** Percentage complete (0-100) */
  percentage: number
}
