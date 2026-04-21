/**
 * Schedule API Client
 *
 * Fetches schedule data from c123-server REST API (XML source).
 * Used to enrich WebSocket schedule with date and course information.
 */

import { getApiBaseUrl } from './serverConfig'

interface RestScheduleItem {
  raceId: string
  startTime?: string
  courseNr?: number
}

interface RestScheduleResponse {
  schedule: RestScheduleItem[]
}

export interface ScheduleEnrichment {
  dateMap: Map<string, string>    // raceId → YYYY-MM-DD
  courseNrMap: Map<string, number> // raceId → courseNr
}

/**
 * Extract date string (YYYY-MM-DD) from ISO 8601 timestamp.
 * Returns null if the string doesn't contain a valid date.
 */
function extractDate(isoString: string | undefined): string | null {
  if (!isoString) return null
  const match = isoString.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/**
 * Fetch schedule from REST API and return both date and courseNr enrichment maps.
 * Returns empty maps on any error (graceful degradation).
 */
export async function fetchScheduleEnrichment(baseUrl?: string): Promise<ScheduleEnrichment> {
  const empty: ScheduleEnrichment = { dateMap: new Map(), courseNrMap: new Map() }
  const url = baseUrl ?? getApiBaseUrl()
  try {
    const response = await fetch(`${url}/api/xml/schedule`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return empty

    const data: RestScheduleResponse = await response.json()
    const dateMap = new Map<string, string>()
    const courseNrMap = new Map<string, number>()

    for (const item of data.schedule ?? []) {
      const date = extractDate(item.startTime)
      if (date) dateMap.set(item.raceId, date)
      if (item.courseNr !== undefined) courseNrMap.set(item.raceId, item.courseNr)
    }

    return { dateMap, courseNrMap }
  } catch {
    return empty
  }
}

/**
 * Fetch schedule from REST API and return a map of raceId → date (YYYY-MM-DD).
 * Returns empty map on any error (graceful degradation).
 *
 * @deprecated Use fetchScheduleEnrichment instead for richer data.
 */
export async function fetchScheduleDates(baseUrl?: string): Promise<Map<string, string>> {
  const { dateMap } = await fetchScheduleEnrichment(baseUrl)
  return dateMap
}
