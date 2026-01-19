/**
 * Utilities for parsing and working with gate penalty data
 */

/**
 * Parse the gates string from C123 Results into an array of penalty values
 *
 * Handles multiple formats:
 * 1. Fixed-width 3 chars (C123 XML): "  0  0  2 50  0" - each value is 3 chars
 * 2. Trimmed fixed-width: "0  0  2 50  0" - server trimmed leading spaces
 * 3. Single-space separated: "0 0 2 50 0" - legacy format
 *
 * Empty positions (deleted penalties) are preserved as null.
 */
export function parseResultsGatesString(gates: string): (number | null)[] {
  if (!gates) return []

  // Detect format: if contains double-space, it's fixed-width 3-char format
  // (possibly with leading spaces trimmed by server)
  if (gates.includes('  ')) {
    return parseFixedWidthGates(gates)
  }

  // Single-space separated format (legacy/test data)
  return gates.trim().split(' ').map((val) => {
    if (val === '' || val === undefined) return null
    const num = parseInt(val, 10)
    return isNaN(num) ? null : num
  })
}

/**
 * Parse fixed-width 3-character gates format from C123
 * Each gate value occupies exactly 3 characters, right-aligned
 * Server may trim leading spaces, so we detect and restore them
 */
function parseFixedWidthGates(gates: string): (number | null)[] {
  // If server trimmed leading spaces, restore them
  // Total length must be divisible by 3
  const remainder = gates.length % 3
  const padding = remainder === 0 ? 0 : 3 - remainder
  const normalized = ' '.repeat(padding) + gates

  const result: (number | null)[] = []

  for (let i = 0; i < normalized.length; i += 3) {
    const block = normalized.substring(i, i + 3).trim()
    if (block === '') {
      result.push(null)
    } else {
      const num = parseInt(block, 10)
      result.push(isNaN(num) ? null : num)
    }
  }

  // Remove trailing nulls (padding from C123 XML)
  while (result.length > 0 && result[result.length - 1] === null) {
    result.pop()
  }

  return result
}
