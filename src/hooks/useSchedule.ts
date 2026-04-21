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
  displayTitle: string // shortTitle with date suffix for multi-day events
  date: string | null // YYYY-MM-DD from REST enrichment
  courseNr: number | null // course number from REST enrichment
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
  /** True when races span multiple calendar days */
  isMultiDay: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  return `${parseInt(day, 10)}.${parseInt(month, 10)}.`
}

function processRace(
  race: C123ScheduleRace,
  dateMap: Map<string, string> | undefined,
  isMultiDay: boolean,
  courseNrMap?: Map<string, number>
): ProcessedRace {
  const status = race.raceStatus as RaceStatus
  const shortTitle = race.shortTitle || race.mainTitle
  const date = dateMap?.get(race.raceId) ?? null
  const courseNr = courseNrMap?.get(race.raceId) ?? null
  const displayTitle =
    isMultiDay && date ? shortTitle + ' (' + formatShortDate(date) + ')' : shortTitle
  return {
    raceId: race.raceId,
    order: race.order,
    mainTitle: race.mainTitle,
    subTitle: race.subTitle,
    shortTitle,
    displayTitle,
    date,
    courseNr,
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

export function useSchedule(
  schedule: C123ScheduleData | null,
  dateMap?: Map<string, string>,
  courseNrMap?: Map<string, number>
): UseScheduleReturn {
  const isMultiDay = useMemo(() => {
    if (!dateMap || dateMap.size === 0) return false
    const uniqueDates = new Set(dateMap.values())
    return uniqueDates.size > 1
  }, [dateMap])

  const races = useMemo(() => {
    if (!schedule?.races) return []
    return schedule.races
      .map((race) => processRace(race, dateMap, isMultiDay, courseNrMap))
      .sort((a, b) => a.order - b.order)
  }, [schedule, dateMap, isMultiDay, courseNrMap])

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
    isMultiDay,
  }
}
