import { describe, it, expect } from 'vitest'
import {
  parseGatesString,
  parseResultsGatesString,
  parseGateConfig,
  parseGatesWithConfig,
  parseResultsGatesWithConfig,
  calculateTotalPenalty,
  formatPenalty,
  getPenaltyClass,
} from './gates'
import { sampleGateConfig, sampleGatesStrings } from '../test/fixtures/sample-data'

describe('gates utilities', () => {
  describe('parseGatesString (OnCourse format)', () => {
    it('parses all clear gates', () => {
      const result = parseGatesString(sampleGatesStrings.onCourse.allClear)
      expect(result).toHaveLength(24)
      expect(result.every((v) => v === 0)).toBe(true)
    })

    it('parses gates with penalties', () => {
      const result = parseGatesString(sampleGatesStrings.onCourse.withPenalties)
      expect(result).toHaveLength(24)
      expect(result[3]).toBe(2) // gate 4 has touch
      expect(result[6]).toBe(2) // gate 7 has touch
      expect(result[8]).toBe(50) // gate 9 has miss
    })

    it('parses partial gates (competitor still on course)', () => {
      const result = parseGatesString(sampleGatesStrings.onCourse.partial)
      // 24 commas = 25 values (trailing comma creates empty last value)
      expect(result.length).toBeGreaterThanOrEqual(24)
      expect(result[0]).toBe(0)
      expect(result[8]).toBe(50)
      expect(result[9]).toBeNull() // not yet judged
    })

    it('handles empty string', () => {
      const result = parseGatesString(sampleGatesStrings.onCourse.empty)
      expect(result).toHaveLength(0)
    })

    it('handles all empty values', () => {
      const result = parseGatesString(sampleGatesStrings.onCourse.allEmpty)
      expect(result).toHaveLength(25) // 24 commas = 25 values
      expect(result.every((v) => v === null)).toBe(true)
    })
  })

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

  describe('parseGateConfig', () => {
    it('parses 24 gate config', () => {
      const result = parseGateConfig(sampleGateConfig.normal24)
      expect(result).toHaveLength(24)
      expect(result[0]).toBe('N')
      expect(result[2]).toBe('R') // gate 3 is reverse
      expect(result[5]).toBe('R') // gate 6 is reverse
    })

    it('parses 18 gate config', () => {
      const result = parseGateConfig(sampleGateConfig.normal18)
      expect(result).toHaveLength(18)
    })

    it('handles empty config', () => {
      const result = parseGateConfig('')
      expect(result).toHaveLength(0)
    })

    it('filters invalid characters', () => {
      const result = parseGateConfig('NXR123N')
      expect(result).toEqual(['N', 'R', 'N'])
    })
  })

  describe('parseGatesWithConfig', () => {
    it('combines gates and config', () => {
      const result = parseGatesWithConfig(
        sampleGatesStrings.onCourse.withPenalties,
        sampleGateConfig.normal24
      )
      expect(result).toHaveLength(24)
      expect(result[0]).toEqual({ gate: 1, value: 0, type: 'N' })
      expect(result[2]).toEqual({ gate: 3, value: 0, type: 'R' }) // reverse gate
      expect(result[3]).toEqual({ gate: 4, value: 2, type: 'N' }) // touch
      expect(result[8]).toEqual({ gate: 9, value: 50, type: 'N' }) // miss
    })

    it('handles partial gates', () => {
      const result = parseGatesWithConfig(
        sampleGatesStrings.onCourse.partial,
        sampleGateConfig.normal24
      )
      expect(result[9].value).toBeNull()
    })

    it('handles missing config', () => {
      const result = parseGatesWithConfig(sampleGatesStrings.onCourse.withPenalties, '')
      expect(result).toHaveLength(24)
      expect(result[0].type).toBe('N') // defaults to Normal
    })
  })

  describe('parseResultsGatesWithConfig', () => {
    it('combines results gates and config', () => {
      const result = parseResultsGatesWithConfig(
        sampleGatesStrings.results.withPenalties,
        sampleGateConfig.normal24
      )
      expect(result).toHaveLength(24)
      expect(result[0]).toEqual({ gate: 1, value: 0, type: 'N' })
      expect(result[2]).toEqual({ gate: 3, value: 0, type: 'R' })
      expect(result[8]).toEqual({ gate: 9, value: 50, type: 'N' })
    })
  })

  describe('calculateTotalPenalty', () => {
    it('calculates zero for all clear', () => {
      const result = calculateTotalPenalty(sampleGatesStrings.onCourse.allClear)
      expect(result).toBe(0)
    })

    it('calculates correct total with penalties', () => {
      const result = calculateTotalPenalty(sampleGatesStrings.onCourse.withPenalties)
      expect(result).toBe(54) // 2 + 2 + 50
    })

    it('handles partial gates', () => {
      const result = calculateTotalPenalty(sampleGatesStrings.onCourse.partial)
      expect(result).toBe(54)
    })

    it('handles empty string', () => {
      const result = calculateTotalPenalty('')
      expect(result).toBe(0)
    })
  })

  describe('formatPenalty', () => {
    it('formats null as empty string', () => {
      expect(formatPenalty(null)).toBe('')
    })

    it('formats 0 as "0"', () => {
      expect(formatPenalty(0)).toBe('0')
    })

    it('formats 2 as "2"', () => {
      expect(formatPenalty(2)).toBe('2')
    })

    it('formats 50 as "50"', () => {
      expect(formatPenalty(50)).toBe('50')
    })

    it('formats other values as string', () => {
      expect(formatPenalty(4)).toBe('4')
      expect(formatPenalty(100)).toBe('100')
    })
  })

  describe('getPenaltyClass', () => {
    it('returns correct class for null', () => {
      expect(getPenaltyClass(null)).toBe('penalty-empty')
    })

    it('returns correct class for 0', () => {
      expect(getPenaltyClass(0)).toBe('penalty-clear')
    })

    it('returns correct class for 2', () => {
      expect(getPenaltyClass(2)).toBe('penalty-touch')
    })

    it('returns correct class for 50', () => {
      expect(getPenaltyClass(50)).toBe('penalty-miss')
    })

    it('returns other class for unexpected values', () => {
      expect(getPenaltyClass(4)).toBe('penalty-other')
      expect(getPenaltyClass(100)).toBe('penalty-other')
    })
  })
})
