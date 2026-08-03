/**
 * Penalty Checks API Client
 *
 * REST client for c123-server /api/checks (0.12.0+).
 */

import { fetchWithRetry } from './http'
import { getApiBaseUrl } from './serverConfig'
import type { AllChecksResponse, CheckEntry, FlagEntry } from '../types/checks'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function raceUrl(raceId: string, suffix = ''): string {
  return `${getApiBaseUrl()}/api/checks/${encodeURIComponent(raceId)}${suffix}`
}

/** Every race of the current event in one call. */
export async function fetchAllChecks(): Promise<AllChecksResponse> {
  return fetchWithRetry<AllChecksResponse>(`${getApiBaseUrl()}/api/checks`, { method: 'GET' })
}

/**
 * Verify a gate.
 *
 * `value` is always sent explicitly: the server's XML fallback would snapshot
 * the previous value after a scoring write and the check would read as stale
 * immediately.
 */
export async function setCheck(
  raceId: string,
  bib: string,
  gate: number,
  value: number | null,
  tag?: string
): Promise<CheckEntry> {
  const body: Record<string, unknown> = { bib, gate, value }
  if (tag !== undefined) body.tag = tag

  const response = await fetchWithRetry<{ success: boolean; check: CheckEntry }>(
    raceUrl(raceId, '/check'),
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) }
  )
  return response.check
}

export async function removeCheck(raceId: string, bib: string, gate: number): Promise<void> {
  await fetchWithRetry<{ success: boolean }>(raceUrl(raceId, '/check'), {
    method: 'DELETE',
    headers: JSON_HEADERS,
    body: JSON.stringify({ bib, gate }),
  })
}

export async function createFlag(
  raceId: string,
  bib: string,
  gate: number,
  comment: string,
  suggestedValue?: number | null
): Promise<FlagEntry> {
  const body: Record<string, unknown> = { bib, gate, comment }
  if (suggestedValue !== undefined) body.suggestedValue = suggestedValue

  const response = await fetchWithRetry<{ success: boolean; flag: FlagEntry }>(
    raceUrl(raceId, '/flag'),
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) }
  )
  return response.flag
}

/** Resolving also verifies the gate — the server creates the check. */
export async function resolveFlag(
  raceId: string,
  flagId: string,
  resolution?: string
): Promise<{ flag: FlagEntry; check?: CheckEntry }> {
  const body: Record<string, unknown> = {}
  if (resolution !== undefined) body.resolution = resolution

  return fetchWithRetry<{ success: boolean; flag: FlagEntry; check?: CheckEntry }>(
    raceUrl(raceId, `/flag/${encodeURIComponent(flagId)}`),
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) }
  )
}

/**
 * The server also returns the deleted flag (`{ success, flag }`), but callers
 * already know the id they asked to delete, so it is discarded here.
 */
export async function deleteFlag(raceId: string, flagId: string): Promise<void> {
  await fetchWithRetry<{ success: boolean; flag: FlagEntry }>(
    raceUrl(raceId, `/flag/${encodeURIComponent(flagId)}`),
    { method: 'DELETE' }
  )
}
