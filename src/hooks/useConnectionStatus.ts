import { useMemo } from 'react'
import type { ConnectionState } from './useC123WebSocket'
import type { C123ConnectedData } from '../types/c123server'

// =============================================================================
// Types
// =============================================================================

export interface ConnectionStatus {
  /** Current connection state */
  state: ConnectionState
  /** Human-readable status text */
  statusText: string
  /** Whether the connection is healthy */
  isHealthy: boolean
  /** Whether C123 timing software is connected to server */
  isC123Connected: boolean
  /** Whether XML data is loaded on server */
  isXmlLoaded: boolean
  /** Server version string */
  serverVersion: string | null
  /** Time since last message (ms), null if never received */
  latency: number | null
  /** CSS class for status indicator */
  statusClass: 'success' | 'warning' | 'error' | 'neutral'
}

// =============================================================================
// Constants
// =============================================================================

/** If no message received in this time, consider connection stale */
const STALE_THRESHOLD_MS = 10000

// =============================================================================
// Hook Implementation
// =============================================================================

export function useConnectionStatus(
  connectionState: ConnectionState,
  serverInfo: C123ConnectedData | null,
  lastMessageTime: number | null,
  lastError: string | null
): ConnectionStatus {
  return useMemo(() => {
    const now = Date.now()
    const latency = lastMessageTime ? now - lastMessageTime : null
    const isStale = latency !== null && latency > STALE_THRESHOLD_MS

    // Determine status based on state
    let statusText: string
    let isHealthy: boolean
    let statusClass: ConnectionStatus['statusClass']

    switch (connectionState) {
      case 'connected':
        if (!serverInfo?.c123Connected) {
          statusText = 'Server connected, waiting for C123'
          isHealthy = false
          statusClass = 'warning'
        } else if (!serverInfo?.xmlLoaded) {
          statusText = 'C123 connected, no race data'
          isHealthy = false
          statusClass = 'warning'
        } else if (isStale) {
          statusText = 'Connection stale'
          isHealthy = false
          statusClass = 'warning'
        } else {
          statusText = 'Connected'
          isHealthy = true
          statusClass = 'success'
        }
        break

      case 'connecting':
        statusText = 'Connecting...'
        isHealthy = false
        statusClass = 'neutral'
        break

      case 'error':
        statusText = lastError || 'Connection error'
        isHealthy = false
        statusClass = 'error'
        break

      case 'disconnected':
      default:
        statusText = 'Disconnected'
        isHealthy = false
        statusClass = 'neutral'
        break
    }

    return {
      state: connectionState,
      statusText,
      isHealthy,
      isC123Connected: serverInfo?.c123Connected ?? false,
      isXmlLoaded: serverInfo?.xmlLoaded ?? false,
      serverVersion: serverInfo?.version ?? null,
      latency,
      statusClass,
    }
  }, [connectionState, serverInfo, lastMessageTime, lastError])
}
