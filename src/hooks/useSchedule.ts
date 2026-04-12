import { useMemo } from 'react'
import type { C123ScheduleData, C123ScheduleRace } from '../types/c123server'

// =============================================================================
// Types
// =============================================================================

/**
 * Race status values from C123 (source: RaceStati.cs)
 * Normal progression: 0 -> 1 -> 3 -> 4 -> 5
 */
export type RaceStatus =
  | 0 // Scheduled
  | 1 // StartList
  | 2 // Delayed
  | 3 // InProgress
  | 4 // Unofficial (results being processed)
  | 5 // Official (results published)
  | 6 // Revised
  | 7 // Cancelled
  | 8 // GettingReady
  | 9 // Unconfirmed
  | 10 // Protested
  | 11 // Interrupted
  | 12 // Rescheduled
  | 13 // Postponed

export interface ProcessedRace {
  raceId: string
  order: number
  mainTitle: string
  subTitle: string
  shortTitle: string
  raceStatus: RaceStatus
  startTime: string
  isActive: boolean // Status 3-5: running or finished
  isRunning: boolean // Status 3: currently in progress
  isFinished: boolean // Status 5: completed
}

export interface UseScheduleReturn {
  /** All races from schedule */
  races: ProcessedRace[]
  /** Races that are active (status >= 3) */
  activeRaces: ProcessedRace[]
  /** Currently running race (status 3) */
  runningRace: ProcessedRace | null
  /** Find race by ID */
  getRaceById: (raceId: string) => ProcessedRace | undefined
}

// =============================================================================
// Helper Functions
// =============================================================================

function processRace(race: C123ScheduleRace): ProcessedRace {
  const status = race.raceStatus as RaceStatus
  return {
    raceId: race.raceId,
    order: race.order,
    mainTitle: race.mainTitle,
    subTitle: race.subTitle,
    shortTitle: race.shortTitle || race.mainTitle,
    raceStatus: status,
    startTime: race.startTime,
    isActive: status >= 3 && status <= 5,
    isRunning: status === 3,
    isFinished: status === 5,
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSchedule(schedule: C123ScheduleData | null): UseScheduleReturn {
  const races = useMemo(() => {
    if (!schedule?.races) return []
    return schedule.races.map(processRace).sort((a, b) => a.order - b.order)
  }, [schedule])

  const activeRaces = useMemo(
    () => races.filter((r) => r.isActive),
    [races]
  )

  const runningRace = useMemo(
    () => races.find((r) => r.isRunning) ?? null,
    [races]
  )

  const getRaceById = useMemo(() => {
    const raceMap = new Map(races.map((r) => [r.raceId, r]))
    return (raceId: string) => raceMap.get(raceId)
  }, [races])

  return {
    races,
    activeRaces,
    runningRace,
    getRaceById,
  }
}
