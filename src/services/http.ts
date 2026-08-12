/**
 * Shared HTTP helper for c123-server REST clients.
 *
 * Timeout, bounded retry on network and 5xx errors, no retry on 4xx.
 */

export interface ApiErrorBody {
  error: string
  detail?: string
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly detail?: string

  constructor(message: string, status: number, detail?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.detail = detail
  }

  /** C123 (or the checks store) is not available */
  get isC123Disconnected(): boolean {
    return this.status === 503
  }

  get isValidationError(): boolean {
    return this.status === 400
  }
}

const DEFAULT_TIMEOUT = 5000
const MAX_RETRIES = 2
const RETRY_DELAY = 500

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
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)

      if (!response.ok) {
        const errorData: Partial<ApiErrorBody> = await response.json().catch(() => ({}))
        throw new ApiRequestError(
          errorData.error || `HTTP ${response.status}`,
          response.status,
          errorData.detail
        )
      }

      if (response.status === 204) {
        return undefined as T
      }

      return (await response.json()) as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (error instanceof ApiRequestError && error.status >= 400 && error.status < 500) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiRequestError('Request timeout', 408)
      }

      if (attempt < retries) {
        await delay(RETRY_DELAY * (attempt + 1))
      }
    }
  }

  throw lastError ?? new Error('Unknown error')
}
