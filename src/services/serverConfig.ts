/**
 * Server Configuration
 *
 * Centralized REST API base URL management.
 * Used by scoringApi.ts and coursesApi.ts to derive the HTTP base URL
 * from the discovered or manually configured server.
 */

import { STORAGE_KEY } from './discovery-client'

let _baseUrl: string | null = null

/**
 * Set the REST API base URL.
 * Called after discovery or when user changes server URL in settings.
 */
export function setApiBaseUrl(url: string): void {
  _baseUrl = url
}

/**
 * Get the REST API base URL.
 *
 * Priority:
 * 1. Runtime value (set by discovery or settings change)
 * 2. Discovery cache in localStorage
 * 3. Fallback: same hostname, port 27123
 */
export function getApiBaseUrl(): string {
  if (_baseUrl) return _baseUrl

  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) return cached
  } catch {
    // localStorage unavailable
  }

  return `http://${window.location.hostname}:27123`
}
