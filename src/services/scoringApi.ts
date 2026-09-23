/**
 * Scoring API Client
 *
 * REST API client for sending scoring commands to c123-server.
 * All commands are forwarded to C123 via TCP.
 */

import type {
  ScoringRequest,
  RemoveFromCourseRequest,
  TimingRequest,
  PenaltyValue,
  RemoveReason,
  ChannelPosition,
} from '../types/scoring'
import { getApiBaseUrl } from './serverConfig'
import { fetchWithRetry } from './http'

/** @deprecated Use ApiRequestError. Kept so existing call sites keep working. */
export { ApiRequestError as ScoringApiError } from './http'
export type { ApiErrorBody as ApiError } from './http'

// =============================================================================
// Types
// =============================================================================

export interface ScoringResponse {
  success: boolean
  bib: string
  gate: number
  value: PenaltyValue  // includes null for deleted penalty
}

export interface RemoveFromCourseResponse {
  success: boolean
  bib: string
  reason: RemoveReason
  position: number
}

export interface TimingResponse {
  success: boolean
  bib: string
  channelPosition: ChannelPosition
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Send a penalty scoring command to C123
 *
 * @param bib - Competitor start number
 * @param gate - Gate number (1-24)
 * @param value - Penalty value (0, 2, 50, or null to delete)
 * @param raceId - Race ID (required for finished competitors)
 */
export async function sendScoring(
  bib: string,
  gate: number,
  value: PenaltyValue,
  raceId?: string
): Promise<ScoringResponse> {
  const baseUrl = getApiBaseUrl()
  const request: ScoringRequest = { bib, gate, value }
  if (raceId) {
    request.raceId = raceId
  }

  return fetchWithRetry<ScoringResponse>(`${baseUrl}/api/c123/scoring`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
}

/**
 * Remove a competitor from the course
 *
 * @param bib - Competitor start number
 * @param reason - Reason for removal (DNS, DNF, CAP)
 * @param position - Position in the run (default: 1)
 */
export async function sendRemoveFromCourse(
  bib: string,
  reason: RemoveReason,
  position: number = 1
): Promise<RemoveFromCourseResponse> {
  const baseUrl = getApiBaseUrl()
  const request: RemoveFromCourseRequest & { position: number } = { bib, reason, position }

  return fetchWithRetry<RemoveFromCourseResponse>(`${baseUrl}/api/c123/remove-from-course`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
}

/**
 * Send a manual timing impulse to C123
 *
 * @param bib - Competitor start number
 * @param channelPosition - Timing position (Start, Finish, Split1, Split2)
 */
export async function sendTiming(
  bib: string,
  channelPosition: ChannelPosition
): Promise<TimingResponse> {
  const baseUrl = getApiBaseUrl()
  const request: TimingRequest = { bib, channelPosition }

  return fetchWithRetry<TimingResponse>(`${baseUrl}/api/c123/timing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
}

// =============================================================================
// Exports
// =============================================================================

export const scoringApi = {
  sendScoring,
  sendRemoveFromCourse,
  sendTiming,
}
