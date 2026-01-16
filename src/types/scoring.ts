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
 */
export type PenaltyValue = 0 | 2 | 50

/**
 * Gate penalty state including empty (not yet passed)
 */
export type GatePenalty = PenaltyValue | null

// =============================================================================
// Competitor State
// =============================================================================

/**
 * State of a competitor in the scoring workflow
 */
export type CompetitorState =
  | 'waiting' // In startlist, not yet started
  | 'onCourse' // Currently on course
  | 'finished' // Finished, awaiting verification
  | 'checked' // Penalties verified by judge

// =============================================================================
// REST API Request Types
// =============================================================================

/**
 * Request to set a penalty for a gate
 * POST /api/c123/scoring
 */
export interface ScoringRequest {
  bib: string
  gate: number
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
// API Response Types
// =============================================================================

/**
 * Standard API response
 */
export interface ApiResponse {
  success: boolean
  message?: string
  error?: string
}

// =============================================================================
// Parsed Gate Data
// =============================================================================

/**
 * Gate information with parsed penalty
 */
export interface GateInfo {
  number: number
  type: 'N' | 'R' // Normal or Reverse
  penalty: GatePenalty
}

/**
 * Parsed competitor data for the grid
 */
export interface ParsedCompetitor {
  bib: string
  name: string
  club: string
  nat: string
  raceId: string
  startOrder: number
  state: CompetitorState
  gates: GateInfo[]
  totalPenalty: number
  time: string | null
  total: string | null
  rank: number | null
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse gates string from C123 format to array of penalties
 * Format: "0,0,0,2,0,0,2,0,50,,,,,,,,,,,,,,,"
 */
export function parseGates(gatesString: string, gateConfig: string): GateInfo[] {
  const values = gatesString.split(',')
  const gates: GateInfo[] = []

  for (let i = 0; i < gateConfig.length; i++) {
    const valueStr = values[i]
    let penalty: GatePenalty = null

    if (valueStr === '0') {
      penalty = 0
    } else if (valueStr === '2') {
      penalty = 2
    } else if (valueStr === '50') {
      penalty = 50
    }

    gates.push({
      number: i + 1,
      type: gateConfig[i] as 'N' | 'R',
      penalty,
    })
  }

  return gates
}

/**
 * Calculate total penalty seconds from gates
 */
export function calculateTotalPenalty(gates: GateInfo[]): number {
  return gates.reduce((sum, gate) => sum + (gate.penalty ?? 0), 0)
}

/**
 * Check if a value is a valid penalty
 */
export function isValidPenalty(value: number): value is PenaltyValue {
  return value === 0 || value === 2 || value === 50
}
