import { describe, it, expect } from 'vitest'
import { parseResultsGatesString } from './gates'
import { sampleGatesStrings } from '../test/fixtures/sample-data'

describe('gates utilities', () => {
  describe('parseResultsGatesString (Results format)', () => {
    it('parses all clear gates', () => {
      const result = parseResultsGatesString(sampleGatesStrings.results.allClear)
      expect(result).toHaveLength(24)
      expect(result.every((v) => v === 0)).toBe(true)
    })

    it('parses gates with penalties', () => {
      const result = parseResultsGatesString(sampleGatesStrings.results.withPenalties)
      expect(result).toHaveLength(24)
      expect(result[3]).toBe(2)
      expect(result[6]).toBe(2)
      expect(result[8]).toBe(50)
    })

    it('parses multiple misses', () => {
      const result = parseResultsGatesString(sampleGatesStrings.results.multipleMisses)
      expect(result.filter((v) => v === 50)).toHaveLength(3)
      expect(result.filter((v) => v === 2)).toHaveLength(3)
    })

    it('handles empty string', () => {
      const result = parseResultsGatesString('')
      expect(result).toHaveLength(0)
    })

    it('parses gates with double spaces (real C123 format)', () => {
      const result = parseResultsGatesString(sampleGatesStrings.results.doubleSpaces)
      expect(result).toHaveLength(24)
      expect(result[3]).toBe(2)
      expect(result[6]).toBe(2)
      expect(result[8]).toBe(50)
    })

    it('parses fixed-width 3-char format (raw C123 XML)', () => {
      const result = parseResultsGatesString(sampleGatesStrings.results.fixedWidth)
      expect(result).toHaveLength(24)
      expect(result[0]).toBe(0)
      expect(result[3]).toBe(2)
      expect(result[8]).toBe(50)
    })

    it('parses fixed-width format with empty value (deleted penalty)', () => {
      const result = parseResultsGatesString(sampleGatesStrings.results.fixedWidthWithEmpty)
      expect(result).toHaveLength(24)
      expect(result[0]).toBe(0)
      expect(result[3]).toBeNull() // deleted penalty
      expect(result[4]).toBe(0)
      expect(result[8]).toBe(50)
    })

    it('parses trimmed fixed-width format with empty value (real server data)', () => {
      // Real data from WebSocket after server trims leading spaces
      // "0  0  0  2  2  0     2  0  0  0 50  2  2"
      const result = parseResultsGatesString(sampleGatesStrings.results.trimmedWithEmpty)
      expect(result).toHaveLength(14)
      expect(result[0]).toBe(0)
      expect(result[1]).toBe(0)
      expect(result[2]).toBe(0)
      expect(result[3]).toBe(2)
      expect(result[4]).toBe(2)
      expect(result[5]).toBe(0)
      expect(result[6]).toBeNull() // deleted penalty (3 spaces = empty block)
      expect(result[7]).toBe(2)
      expect(result[11]).toBe(50)
      expect(result[12]).toBe(2)
      expect(result[13]).toBe(2)
    })
  })

  describe('sparse gates — untrimmed from server with trimValues: false (issue #2 + c123-server#75)', () => {
    // C123 uses "   " (3 spaces) for unscored gates — semantically different from "  0" (clean)
    // With server fix, these strings arrive preserved to the client

    it('parses all-empty 24-gate string as 24 nulls', () => {
      const result = parseResultsGatesString(sampleGatesStrings.sparse.allEmpty24)
      expect(result).toHaveLength(24)
      expect(result.every((v) => v === null)).toBe(true)
    })

    it('parses all-empty 30-gate string as 30 nulls', () => {
      const result = parseResultsGatesString(sampleGatesStrings.sparse.allEmpty30)
      expect(result).toHaveLength(30)
      expect(result.every((v) => v === null)).toBe(true)
    })

    it('parses single penalty at gate 5 in 24-gate course', () => {
      const result = parseResultsGatesString(sampleGatesStrings.sparse.gate5touch24)
      expect(result).toHaveLength(24)
      expect(result[0]).toBeNull()
      expect(result[3]).toBeNull()
      expect(result[4]).toBe(2)
      expect(result[5]).toBeNull()
      expect(result[23]).toBeNull()
    })

    it('parses single penalty at gate 5 in 30-gate course', () => {
      const result = parseResultsGatesString(sampleGatesStrings.sparse.gate5touch30)
      expect(result).toHaveLength(30)
      expect(result[4]).toBe(2)
      expect(result[0]).toBeNull()
      expect(result[29]).toBeNull()
    })

    it('parses gates 1 and 5 both scored, rest unscored', () => {
      const result = parseResultsGatesString(sampleGatesStrings.sparse.gate1and5)
      expect(result).toHaveLength(24)
      expect(result[0]).toBe(2)
      expect(result[1]).toBeNull()
      expect(result[4]).toBe(2)
      expect(result[23]).toBeNull()
    })

    it('parses only gate 1 scored in 24-gate course', () => {
      const result = parseResultsGatesString(sampleGatesStrings.sparse.gate1only)
      expect(result).toHaveLength(24)
      expect(result[0]).toBe(2)
      expect(result[1]).toBeNull()
      expect(result[23]).toBeNull()
    })

    it('parses scattered penalties across 24 gates', () => {
      const result = parseResultsGatesString(sampleGatesStrings.sparse.scattered24)
      expect(result).toHaveLength(24)
      expect(result[2]).toBe(2)   // gate 3
      expect(result[9]).toBe(50)  // gate 10
      expect(result[19]).toBe(2)  // gate 20
      expect(result[0]).toBeNull()
      expect(result[23]).toBeNull()
    })
  })
})
