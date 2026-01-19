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
})
