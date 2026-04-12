/**
 * useServerDiscovery Hook
 *
 * Manages server autodiscovery lifecycle.
 * Only runs when serverUrl is the default (localhost).
 * Returns discovered server URLs or falls back to existing settings.
 */

import { useState, useEffect, useRef } from 'react'
import { discoverC123Server, getWebSocketUrl } from '../services/discovery-client'

const DEFAULT_SERVER_URL = 'ws://localhost:27123/ws'
const DISCOVERY_TIMEOUT_MS = 10_000

export type DiscoveryStatus = 'discovering' | 'found' | 'not-found'

export interface DiscoveryState {
  status: DiscoveryStatus
  /** HTTP base URL of discovered server (e.g., "http://192.168.1.50:27123") */
  httpBaseUrl: string | null
  /** WebSocket URL of discovered server (e.g., "ws://192.168.1.50:27123/ws") */
  wsUrl: string | null
}

interface UseServerDiscoveryOptions {
  /** Current server URL from settings */
  serverUrl: string
}

/**
 * Discovers c123-server on the local network.
 *
 * Logic guard: only runs discovery if serverUrl is the default (localhost).
 * If user already configured a custom URL, returns 'not-found' immediately
 * so the app uses existing settings.
 */
export function useServerDiscovery({ serverUrl }: UseServerDiscoveryOptions): DiscoveryState {
  const [state, setState] = useState<DiscoveryState>(() => {
    // Skip discovery if user has a non-default URL configured
    if (serverUrl !== DEFAULT_SERVER_URL) {
      return { status: 'not-found', httpBaseUrl: null, wsUrl: null }
    }
    return { status: 'discovering', httpBaseUrl: null, wsUrl: null }
  })

  const hasRun = useRef(false)

  useEffect(() => {
    // Skip if not default URL or already completed
    if (serverUrl !== DEFAULT_SERVER_URL) return
    if (hasRun.current) return
    hasRun.current = true

    let cancelled = false

    async function discover() {
      // Race discovery against overall timeout
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), DISCOVERY_TIMEOUT_MS)
      )

      const result = await Promise.race([
        discoverC123Server(),
        timeoutPromise,
      ])

      if (cancelled) return

      if (result) {
        const wsUrl = getWebSocketUrl(result)
        setState({
          status: 'found',
          httpBaseUrl: result,
          wsUrl,
        })
      } else {
        setState({
          status: 'not-found',
          httpBaseUrl: null,
          wsUrl: null,
        })
      }
    }

    discover()

    return () => {
      cancelled = true
    }
  }, [serverUrl])

  return state
}
