import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSchedule } from './useSchedule'
import type { C123ScheduleData } from '../types/c123server'

// =============================================================================
// Test Fixtures
// =============================================================================

const createScheduleRace = (overrides: Partial<C123ScheduleData['races'][0]> = {}) => ({
  order: 1,
  raceId: 'race-001',
  race: 'K1M_ST_BR1',
  mainTitle: 'K1m',
  subTitle: 'střední trať',
  shortTitle: 'K1m - střední trať - 1. jízda',
  raceStatus: 3, // Running
  startTime: '10:00:00',
  ...overrides,
})

const sampleScheduleData: C123ScheduleData = {
  races: [
    createScheduleRace({ raceId: 'race-001', order: 1, raceStatus: 5 }), // Finished
    createScheduleRace({ raceId: 'race-002', order: 2, raceStatus: 3, mainTitle: 'C1m' }), // Running
    createScheduleRace({ raceId: 'race-003', order: 3, raceStatus: 0, mainTitle: 'K1w' }), // Not started
    createScheduleRace({ raceId: 'race-004', order: 4, raceStatus: 4, mainTitle: 'C1w' }), // Run finished
  ],
}

// =============================================================================
// Tests
// =============================================================================

describe('useSchedule', () => {
  describe('with null schedule', () => {
    it('returns empty races array', () => {
      const { result } = renderHook(() => useSchedule(null))

      expect(result.current.races).toEqual([])
      expect(result.current.activeRaces).toEqual([])
      expect(result.current.runningRace).toBeNull()
    })

    it('getRaceById returns undefined', () => {
      const { result } = renderHook(() => useSchedule(null))

      expect(result.current.getRaceById('race-001')).toBeUndefined()
    })
  })

  describe('with empty schedule', () => {
    it('returns empty races array', () => {
      const { result } = renderHook(() => useSchedule({ races: [] }))

      expect(result.current.races).toEqual([])
      expect(result.current.activeRaces).toEqual([])
      expect(result.current.runningRace).toBeNull()
    })
  })

  describe('races processing', () => {
    it('returns all races sorted by order', () => {
      const { result } = renderHook(() => useSchedule(sampleScheduleData))

      expect(result.current.races).toHaveLength(4)
      expect(result.current.races[0].raceId).toBe('race-001')
      expect(result.current.races[1].raceId).toBe('race-002')
      expect(result.current.races[2].raceId).toBe('race-003')
      expect(result.current.races[3].raceId).toBe('race-004')
    })

    it('processes race data correctly', () => {
      const { result } = renderHook(() => useSchedule(sampleScheduleData))

      const runningRace = result.current.races[1]
      expect(runningRace.mainTitle).toBe('C1m')
      expect(runningRace.subTitle).toBe('střední trať')
      expect(runningRace.shortTitle).toBe('K1m - střední trať - 1. jízda')
      expect(runningRace.raceStatus).toBe(3)
      expect(runningRace.isRunning).toBe(true)
      expect(runningRace.isActive).toBe(true)
      expect(runningRace.isFinished).toBe(false)
    })

    it('uses mainTitle as shortTitle fallback when shortTitle is empty', () => {
      const scheduleWithoutShortTitle: C123ScheduleData = {
        races: [createScheduleRace({ shortTitle: '' })],
      }

      const { result } = renderHook(() => useSchedule(scheduleWithoutShortTitle))

      expect(result.current.races[0].shortTitle).toBe('K1m')
    })
  })

  describe('activeRaces', () => {
    it('returns only races with status >= 3 and <= 5', () => {
      const { result } = renderHook(() => useSchedule(sampleScheduleData))

      expect(result.current.activeRaces).toHaveLength(3) // race-001 (5), race-002 (3), race-004 (4)
      expect(result.current.activeRaces.map((r) => r.raceId)).toEqual([
        'race-001',
        'race-002',
        'race-004',
      ])
    })

    it('returns empty array when no active races', () => {
      const inactiveSchedule: C123ScheduleData = {
        races: [
          createScheduleRace({ raceStatus: 0 }),
          createScheduleRace({ raceId: 'race-002', raceStatus: 1 }),
          createScheduleRace({ raceId: 'race-003', raceStatus: 2 }),
        ],
      }

      const { result } = renderHook(() => useSchedule(inactiveSchedule))

      expect(result.current.activeRaces).toHaveLength(0)
    })
  })

  describe('runningRace', () => {
    it('returns the race with status 3', () => {
      const { result } = renderHook(() => useSchedule(sampleScheduleData))

      expect(result.current.runningRace).not.toBeNull()
      expect(result.current.runningRace?.raceId).toBe('race-002')
      expect(result.current.runningRace?.isRunning).toBe(true)
    })

    it('returns null when no race is running', () => {
      const noRunningSchedule: C123ScheduleData = {
        races: [
          createScheduleRace({ raceStatus: 5 }), // Finished
          createScheduleRace({ raceId: 'race-002', raceStatus: 4 }), // Run finished
        ],
      }

      const { result } = renderHook(() => useSchedule(noRunningSchedule))

      expect(result.current.runningRace).toBeNull()
    })

    it('returns first running race when multiple have status 3', () => {
      const multipleRunningSchedule: C123ScheduleData = {
        races: [
          createScheduleRace({ order: 2, raceId: 'race-002', raceStatus: 3 }),
          createScheduleRace({ order: 1, raceId: 'race-001', raceStatus: 3 }),
        ],
      }

      const { result } = renderHook(() => useSchedule(multipleRunningSchedule))

      // Should return first in sorted order (by order)
      expect(result.current.runningRace?.raceId).toBe('race-001')
    })
  })

  describe('getRaceById', () => {
    it('returns the race with matching ID', () => {
      const { result } = renderHook(() => useSchedule(sampleScheduleData))

      const race = result.current.getRaceById('race-002')
      expect(race).toBeDefined()
      expect(race?.mainTitle).toBe('C1m')
    })

    it('returns undefined for non-existent ID', () => {
      const { result } = renderHook(() => useSchedule(sampleScheduleData))

      expect(result.current.getRaceById('non-existent')).toBeUndefined()
    })
  })

  describe('race status flags', () => {
    it('correctly sets isActive for status 3-5', () => {
      const testSchedule: C123ScheduleData = {
        races: [
          createScheduleRace({ raceId: 'r0', order: 0, raceStatus: 0 }),
          createScheduleRace({ raceId: 'r1', order: 1, raceStatus: 1 }),
          createScheduleRace({ raceId: 'r2', order: 2, raceStatus: 2 }),
          createScheduleRace({ raceId: 'r3', order: 3, raceStatus: 3 }),
          createScheduleRace({ raceId: 'r4', order: 4, raceStatus: 4 }),
          createScheduleRace({ raceId: 'r5', order: 5, raceStatus: 5 }),
        ],
      }

      const { result } = renderHook(() => useSchedule(testSchedule))

      expect(result.current.races[0].isActive).toBe(false) // status 0
      expect(result.current.races[1].isActive).toBe(false) // status 1
      expect(result.current.races[2].isActive).toBe(false) // status 2
      expect(result.current.races[3].isActive).toBe(true) // status 3
      expect(result.current.races[4].isActive).toBe(true) // status 4
      expect(result.current.races[5].isActive).toBe(true) // status 5
    })

    it('correctly sets isRunning for status 3 only', () => {
      const testSchedule: C123ScheduleData = {
        races: [
          createScheduleRace({ raceId: 'r3', order: 3, raceStatus: 3 }),
          createScheduleRace({ raceId: 'r4', order: 4, raceStatus: 4 }),
          createScheduleRace({ raceId: 'r5', order: 5, raceStatus: 5 }),
        ],
      }

      const { result } = renderHook(() => useSchedule(testSchedule))

      expect(result.current.races[0].isRunning).toBe(true) // status 3
      expect(result.current.races[1].isRunning).toBe(false) // status 4
      expect(result.current.races[2].isRunning).toBe(false) // status 5
    })

    it('correctly sets isFinished for status 5 only', () => {
      const testSchedule: C123ScheduleData = {
        races: [
          createScheduleRace({ raceId: 'r3', order: 3, raceStatus: 3 }),
          createScheduleRace({ raceId: 'r4', order: 4, raceStatus: 4 }),
          createScheduleRace({ raceId: 'r5', order: 5, raceStatus: 5 }),
        ],
      }

      const { result } = renderHook(() => useSchedule(testSchedule))

      expect(result.current.races[0].isFinished).toBe(false) // status 3
      expect(result.current.races[1].isFinished).toBe(false) // status 4
      expect(result.current.races[2].isFinished).toBe(true) // status 5
    })
  })
})
