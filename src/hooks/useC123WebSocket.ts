import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  C123Message,
  C123OnCourseData,
  C123ResultsData,
  C123RaceConfigData,
  C123ScheduleData,
  C123ConnectedData,
} from '../types/c123server'
import {
  isConnectedMessage,
  isOnCourseMessage,
  isResultsMessage,
  isRaceConfigMessage,
  isScheduleMessage,
  isErrorMessage,
  isForceRefreshMessage,
} from '../types/c123server'

// =============================================================================
// Types
// =============================================================================

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface C123WebSocketState {
  connectionState: ConnectionState
  serverInfo: C123ConnectedData | null
  onCourse: C123OnCourseData | null
  results: Map<string, C123ResultsData>
  raceConfig: C123RaceConfigData | null
  schedule: C123ScheduleData | null
  lastError: string | null
  lastMessageTime: number | null
}

export interface UseC123WebSocketOptions {
  url: string
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export interface UseC123WebSocketReturn extends C123WebSocketState {
  connect: () => void
  disconnect: () => void
  isConnected: boolean
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_RECONNECT_INTERVAL = 2000
const MAX_RECONNECT_INTERVAL = 30000
const DEFAULT_MAX_ATTEMPTS = Infinity

// =============================================================================
// Hook Implementation
// =============================================================================

export function useC123WebSocket(options: UseC123WebSocketOptions): UseC123WebSocketReturn {
  const {
    url,
    autoConnect = true,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    maxReconnectAttempts = DEFAULT_MAX_ATTEMPTS,
  } = options

  // State
  const [state, setState] = useState<C123WebSocketState>({
    connectionState: 'disconnected',
    serverInfo: null,
    onCourse: null,
    results: new Map(),
    raceConfig: null,
    schedule: null,
    lastError: null,
    lastMessageTime: null,
  })

  // Refs for WebSocket and reconnect logic
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldReconnect = useRef(true)
  const isConnecting = useRef(false)

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const delay = reconnectInterval * Math.pow(1.5, reconnectAttempts.current)
    return Math.min(delay, MAX_RECONNECT_INTERVAL)
  }, [reconnectInterval])

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: C123Message = JSON.parse(event.data)

      setState((prev) => {
        const newState = { ...prev, lastMessageTime: Date.now() }

        if (isConnectedMessage(message)) {
          newState.serverInfo = message.data
          newState.connectionState = 'connected'
        } else if (isOnCourseMessage(message)) {
          newState.onCourse = message.data
        } else if (isResultsMessage(message)) {
          const newResults = new Map(prev.results)
          newResults.set(message.data.raceId, message.data)
          newState.results = newResults
        } else if (isRaceConfigMessage(message)) {
          newState.raceConfig = message.data
        } else if (isScheduleMessage(message)) {
          newState.schedule = message.data
        } else if (isErrorMessage(message)) {
          newState.lastError = message.data.message
        } else if (isForceRefreshMessage(message)) {
          // Clear cached data on force refresh
          newState.onCourse = null
          newState.results = new Map()
          newState.raceConfig = null
        }

        return newState
      })
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }, [])

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Prevent duplicate connections
    if (isConnecting.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    isConnecting.current = true
    shouldReconnect.current = true
    setState((prev) => ({ ...prev, connectionState: 'connecting', lastError: null }))

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        isConnecting.current = false
        reconnectAttempts.current = 0
        // State will be set to 'connected' when we receive Connected message
      }

      ws.onmessage = handleMessage

      ws.onerror = () => {
        isConnecting.current = false
        setState((prev) => ({
          ...prev,
          connectionState: 'error',
          lastError: 'WebSocket connection error',
        }))
      }

      ws.onclose = () => {
        isConnecting.current = false
        wsRef.current = null
        setState((prev) => ({
          ...prev,
          connectionState: 'disconnected',
          serverInfo: null,
        }))

        // Attempt reconnect if we should
        if (shouldReconnect.current && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = getReconnectDelay()
          reconnectTimeoutRef.current = setTimeout(connect, delay)
        }
      }
    } catch (error) {
      isConnecting.current = false
      setState((prev) => ({
        ...prev,
        connectionState: 'error',
        lastError: error instanceof Error ? error.message : 'Failed to connect',
      }))
    }
  }, [url, handleMessage, maxReconnectAttempts, getReconnectDelay])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    isConnecting.current = false
    reconnectAttempts.current = 0

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setState((prev) => ({
      ...prev,
      connectionState: 'disconnected',
      serverInfo: null,
    }))
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && url) {
      connect()
    }

    return () => {
      shouldReconnect.current = false
      isConnecting.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [autoConnect, url, connect])

  return {
    ...state,
    connect,
    disconnect,
    isConnected: state.connectionState === 'connected',
  }
}
