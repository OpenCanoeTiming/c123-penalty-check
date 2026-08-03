/**
 * Penalty Checks API Client
 *
 * REST client for c123-server /api/checks (0.12.0+).
 */

import { fetchWithRetry, ApiRequestError } from './http'
import { getApiBaseUrl } from './serverConfig'
import type { AllChecksResponse, CheckEntry, FlagEntry } from '../types/checks'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function raceUrl(raceId: string, suffix = ''): string {
  return `${getApiBaseUrl()}/api/checks/${encodeURIComponent(raceId)}${suffix}`
}

/**
 * The checks API does not exist on this server: it predates 0.12.0 (404) or
 * its checks store is not initialised (503).
 *
 * Thrown only by `fetchAllChecks` — that is the one call whose 404 can only
 * mean "no such route." Every other endpoint here uses 404 for an ordinary
 * business state (already removed, already deleted, unknown flag id), so a
 * 404 there must not be read as "server too old."
 */
export class ChecksUnavailableError extends ApiRequestError {
  constructor(status: number, detail?: string) {
    super('Penalty checks are not available on this server', status, detail)
    this.name = 'ChecksUnavailableError'
  }
}

/** Every race of the current event in one call. */
export async function fetchAllChecks(): Promise<AllChecksResponse> {
  try {
    return await fetchWithRetry<AllChecksResponse>(`${getApiBaseUrl()}/api/checks`, {
      method: 'GET',
    })
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 404 || error.status === 503)) {
      throw new ChecksUnavailableError(error.status, error.detail)
    }
    throw error
  }
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
  const body: Record<string, unknown> = { bib, gate, value: value ?? null }
  if (tag !== undefined) body.tag = tag

  const response = await fetchWithRetry<{ success: boolean; check: CheckEntry }>(
    raceUrl(raceId, '/check'),
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) }
  )
  return response.check
}

/** Idempotent: a 404 means the check is already gone, which is the requested end state. */
export async function removeCheck(raceId: string, bib: string, gate: number): Promise<void> {
  try {
    await fetchWithRetry<{ success: boolean }>(raceUrl(raceId, '/check'), {
      method: 'DELETE',
      headers: JSON_HEADERS,
      body: JSON.stringify({ bib, gate }),
    })
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return
    throw error
  }
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

/**
 * Resolving also verifies the gate — the server creates the check.
 *
 * A 404 here is a real error (the flag id does not exist) and is left to
 * propagate — unlike `removeCheck`/`deleteFlag`, resolving a nonexistent flag
 * is not something a caller can treat as already done.
 */
export async function resolveFlag(
  raceId: string,
  flagId: string,
  resolution?: string
): Promise<{ flag: FlagEntry; check?: CheckEntry }> {
  const body: Record<string, unknown> = {}
  if (resolution !== undefined) body.resolution = resolution

  const { flag, check } = await fetchWithRetry<{
    success: boolean
    flag: FlagEntry
    check?: CheckEntry
  }>(raceUrl(raceId, `/flag/${encodeURIComponent(flagId)}`), {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  })
  return { flag, check }
}

/**
 * The server also returns the deleted flag (`{ success, flag }`), but callers
 * already know the id they asked to delete, so it is discarded here.
 *
 * Idempotent: a 404 means the flag is already gone, which is the requested
 * end state.
 */
export async function deleteFlag(raceId: string, flagId: string): Promise<void> {
  try {
    await fetchWithRetry<{ success: boolean; flag: FlagEntry }>(
      raceUrl(raceId, `/flag/${encodeURIComponent(flagId)}`),
      { method: 'DELETE' }
    )
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return
    throw error
  }
}
