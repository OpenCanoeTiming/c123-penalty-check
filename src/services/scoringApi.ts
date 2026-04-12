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

// =============================================================================
// Types
// =============================================================================

export interface ApiError {
  error: string
  detail?: string
}

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
// Configuration
// =============================================================================

const DEFAULT_TIMEOUT = 5000
const MAX_RETRIES = 2
const RETRY_DELAY = 500

// =============================================================================
// Helper Functions
// =============================================================================

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)

      if (!response.ok) {
        const errorData: Partial<ApiError> = await response.json().catch(() => ({}))
        throw new ScoringApiError(
          errorData.error || `HTTP ${response.status}`,
          response.status,
          errorData.detail
        )
      }

      return (await response.json()) as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on client errors (4xx)
      if (error instanceof ScoringApiError && error.status >= 400 && error.status < 500) {
        throw error
      }

      // Don't retry on abort
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ScoringApiError('Request timeout', 408)
      }

      // Retry on network errors and 5xx
      if (attempt < retries) {
        await delay(RETRY_DELAY * (attempt + 1))
      }
    }
  }

  throw lastError ?? new Error('Unknown error')
}

// =============================================================================
// Error Class
// =============================================================================

export class ScoringApiError extends Error {
  readonly status: number
  readonly detail?: string

  constructor(message: string, status: number, detail?: string) {
    super(message)
    this.name = 'ScoringApiError'
    this.status = status
    this.detail = detail
  }

  /**
   * Check if error is due to C123 not being connected
   */
  get isC123Disconnected(): boolean {
    return this.status === 503
  }

  /**
   * Check if error is a validation error
   */
  get isValidationError(): boolean {
    return this.status === 400
  }
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
