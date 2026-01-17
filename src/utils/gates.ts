/**
 * Utilities for parsing and working with gate penalty data
 */

export type GateType = 'N' | 'R' // Normal or Reverse

export interface GatePenalty {
  gate: number
  value: number | null // null = not yet judged
  type: GateType
}

/**
 * Parse the gates string from C123 OnCourse into an array of penalty values
 * Format: "0,0,0,2,0,0,2,0,50,,,,,,,,,,,,,,," (comma-separated)
 * Empty values represent gates not yet judged
 */
export function parseGatesString(gates: string): (number | null)[] {
  if (!gates) return []

  return gates.split(',').map((val) => {
    if (val === '' || val === undefined) return null
    const num = parseInt(val, 10)
    return isNaN(num) ? null : num
  })
}

/**
 * Parse the gates string from C123 Results into an array of penalty values
 * Format: "0  0  0  2  0  0  2  0  50" (space-separated, may have multiple spaces)
 * All gates should have values in Results
 */
export function parseResultsGatesString(gates: string): (number | null)[] {
  if (!gates) return []

  // Split by one or more whitespace characters and filter out empty strings
  return gates.trim().split(/\s+/).map((val) => {
    if (val === '' || val === undefined) return null
    const num = parseInt(val, 10)
    return isNaN(num) ? null : num
  })
}

/**
 * Combine Results gates string and config into structured penalty data
 */
export function parseResultsGatesWithConfig(
  gates: string,
  gateConfig: string
): GatePenalty[] {
  const values = parseResultsGatesString(gates)
  const types = parseGateConfig(gateConfig)
  const nrGates = types.length || values.length

  return Array.from({ length: nrGates }, (_, i) => ({
    gate: i + 1,
    value: values[i] ?? null,
    type: types[i] ?? 'N',
  }))
}

/**
 * Parse gate configuration string into array of gate types
 * Format: "NNRNNRNRNNNRNNRNRNNRNNRN" (N=normal, R=reverse)
 */
export function parseGateConfig(config: string): GateType[] {
  if (!config) return []
  return config.split('').filter((c): c is GateType => c === 'N' || c === 'R')
}

/**
 * Combine gates string and config into structured penalty data
 */
export function parseGatesWithConfig(
  gates: string,
  gateConfig: string
): GatePenalty[] {
  const values = parseGatesString(gates)
  const types = parseGateConfig(gateConfig)
  const nrGates = types.length || values.length

  return Array.from({ length: nrGates }, (_, i) => ({
    gate: i + 1,
    value: values[i] ?? null,
    type: types[i] ?? 'N',
  }))
}

/**
 * Calculate total penalty seconds from gates string
 */
export function calculateTotalPenalty(gates: string): number {
  const values = parseGatesString(gates)
  return values.reduce<number>((sum, val) => sum + (val ?? 0), 0)
}

/**
 * Format penalty value for display
 */
export function formatPenalty(value: number | null): string {
  if (value === null) return ''
  if (value === 0) return '0'
  if (value === 2) return '2'
  if (value === 50) return '50'
  return String(value)
}

/**
 * Get CSS class for penalty value
 */
export function getPenaltyClass(value: number | null): string {
  if (value === null) return 'penalty-empty'
  if (value === 0) return 'penalty-clear'
  if (value === 2) return 'penalty-touch'
  if (value === 50) return 'penalty-miss'
  return 'penalty-other'
}
