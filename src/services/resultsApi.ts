/**
 * Results API Client
 *
 * Fetches race results from c123-server REST API and transforms
 * to the C123ResultsData format used by the WebSocket protocol.
 * Enables pre-loading results for races without live WebSocket data.
 */

import { getApiBaseUrl } from './serverConfig'
import type { C123ResultsData, C123ResultRow } from '../types/c123server'

interface RestResultRow {
  raceId: string
  id: string
  startOrder: number
  bib: string
  startTime?: string
  status?: string
  time?: number // milliseconds (raw C123 XML unit, e.g. 76990 = 76.99s)
  pen?: number // seconds
  total?: number // milliseconds
  rank?: number
  gates?: string // space-separated per-gate penalties
  participant?: {
    id: string
    classId: string
    bib: string
    familyName: string
    givenName: string
    club: string
    isTeam: boolean
  }
}

interface RestResultsResponse {
  results: RestResultRow[]
}

/**
 * Convert milliseconds to a formatted seconds string.
 * 78990 → "78.99", undefined → ""
 *
 * The c123-server REST API returns time/total in milliseconds (the raw C123
 * XML unit), despite docs/types historically saying "centiseconds". This
 * matches c123-scoreboard's `formatRestTime` (see c123ServerApi.ts). See #98.
 */
function msToSeconds(ms: number | undefined): string {
  if (ms === undefined || ms === null) return ''
  return (ms / 1000).toFixed(2)
}

/**
 * Transform a REST result row to C123ResultRow (WebSocket format).
 */
function transformRow(row: RestResultRow): C123ResultRow {
  const name = row.participant
    ? `${row.participant.familyName} ${row.participant.givenName}`.trim()
    : ''

  return {
    rank: row.rank ?? 0,
    bib: row.bib ?? '',
    name,
    givenName: row.participant?.givenName ?? '',
    familyName: row.participant?.familyName ?? '',
    club: row.participant?.club ?? '',
    nat: '',
    startOrder: row.startOrder ?? 0,
    startTime: row.startTime ?? '',
    gates: row.gates?.trim() ?? '',
    pen: row.pen ?? 0,
    time: msToSeconds(row.time),
    total: msToSeconds(row.total),
    behind: '',
    status: row.status || undefined,
  }
}

/**
 * Fetch results for a race from REST API and return as C123ResultsData.
 * Returns null on any error (graceful degradation).
 */
export async function fetchRaceResults(
  raceId: string,
  baseUrl?: string
): Promise<C123ResultsData | null> {
  const url = baseUrl ?? getApiBaseUrl()
  try {
    const response = await fetch(`${url}/api/xml/races/${encodeURIComponent(raceId)}/results`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return null

    const data: RestResultsResponse = await response.json()

    return {
      raceId,
      classId: '',
      isCurrent: false,
      mainTitle: '',
      subTitle: '',
      rows: (data.results ?? []).map(transformRow),
    }
  } catch {
    return null
  }
}
