/**
 * useScoring Hook
 *
 * React hook for sending scoring commands with optimistic updates,
 * loading states, and error handling.
 */

import { useCallback, useState, useRef } from 'react'
import {
  sendScoring,
  sendRemoveFromCourse,
  sendTiming,
  ScoringApiError,
} from '../services/scoringApi'
import type { PenaltyValue, RemoveReason, ChannelPosition } from '../types/scoring'

// =============================================================================
// Types
// =============================================================================

export interface PendingOperation {
  id: string
  type: 'scoring' | 'remove' | 'timing'
  bib: string
  timestamp: number
}

export interface ScoringState {
  /** Currently pending operations */
  pendingOperations: Map<string, PendingOperation>
  /** Last error that occurred */
  lastError: ScoringApiError | null
  /** Whether any operation is in progress */
  isLoading: boolean
}

export interface UseScoringReturn extends ScoringState {
  /** Send a penalty scoring command */
  setGatePenalty: (bib: string, gate: number, value: PenaltyValue) => Promise<boolean>
  /** Remove a competitor from course */
  removeFromCourse: (bib: string, reason: RemoveReason) => Promise<boolean>
  /** Send a manual timing impulse */
  sendTimingImpulse: (bib: string, channelPosition: ChannelPosition) => Promise<boolean>
  /** Check if a specific gate has a pending operation */
  isPending: (bib: string, gate?: number) => boolean
  /** Clear the last error */
  clearError: () => void
}

// =============================================================================
// Helper Functions
// =============================================================================

function createOperationId(type: string, bib: string, extra?: string): string {
  return `${type}-${bib}${extra ? `-${extra}` : ''}-${Date.now()}`
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useScoring(): UseScoringReturn {
  const [state, setState] = useState<ScoringState>({
    pendingOperations: new Map(),
    lastError: null,
    isLoading: false,
  })

  // Track pending operations by bib+gate for quick lookup
  const pendingByKey = useRef<Map<string, string>>(new Map())

  const addPending = useCallback((operation: PendingOperation, key: string) => {
    setState((prev) => {
      const newPending = new Map(prev.pendingOperations)
      newPending.set(operation.id, operation)
      return {
        ...prev,
        pendingOperations: newPending,
        isLoading: true,
        lastError: null,
      }
    })
    pendingByKey.current.set(key, operation.id)
  }, [])

  const removePending = useCallback((operationId: string, key: string) => {
    setState((prev) => {
      const newPending = new Map(prev.pendingOperations)
      newPending.delete(operationId)
      return {
        ...prev,
        pendingOperations: newPending,
        isLoading: newPending.size > 0,
      }
    })
    pendingByKey.current.delete(key)
  }, [])

  const setError = useCallback((error: ScoringApiError) => {
    setState((prev) => ({
      ...prev,
      lastError: error,
    }))
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      lastError: null,
    }))
  }, [])

  const setGatePenalty = useCallback(
    async (bib: string, gate: number, value: PenaltyValue): Promise<boolean> => {
      const key = `scoring-${bib}-${gate}`
      const operationId = createOperationId('scoring', bib, String(gate))

      // Check if already pending
      if (pendingByKey.current.has(key)) {
        return false
      }

      const operation: PendingOperation = {
        id: operationId,
        type: 'scoring',
        bib,
        timestamp: Date.now(),
      }

      addPending(operation, key)

      try {
        await sendScoring(bib, gate, value)
        removePending(operationId, key)
        return true
      } catch (error) {
        removePending(operationId, key)
        if (error instanceof ScoringApiError) {
          setError(error)
        } else {
          setError(new ScoringApiError(String(error), 0))
        }
        return false
      }
    },
    [addPending, removePending, setError]
  )

  const removeFromCourse = useCallback(
    async (bib: string, reason: RemoveReason): Promise<boolean> => {
      const key = `remove-${bib}`
      const operationId = createOperationId('remove', bib)

      if (pendingByKey.current.has(key)) {
        return false
      }

      const operation: PendingOperation = {
        id: operationId,
        type: 'remove',
        bib,
        timestamp: Date.now(),
      }

      addPending(operation, key)

      try {
        await sendRemoveFromCourse(bib, reason)
        removePending(operationId, key)
        return true
      } catch (error) {
        removePending(operationId, key)
        if (error instanceof ScoringApiError) {
          setError(error)
        } else {
          setError(new ScoringApiError(String(error), 0))
        }
        return false
      }
    },
    [addPending, removePending, setError]
  )

  const sendTimingImpulse = useCallback(
    async (bib: string, channelPosition: ChannelPosition): Promise<boolean> => {
      const key = `timing-${bib}-${channelPosition}`
      const operationId = createOperationId('timing', bib, channelPosition)

      if (pendingByKey.current.has(key)) {
        return false
      }

      const operation: PendingOperation = {
        id: operationId,
        type: 'timing',
        bib,
        timestamp: Date.now(),
      }

      addPending(operation, key)

      try {
        await sendTiming(bib, channelPosition)
        removePending(operationId, key)
        return true
      } catch (error) {
        removePending(operationId, key)
        if (error instanceof ScoringApiError) {
          setError(error)
        } else {
          setError(new ScoringApiError(String(error), 0))
        }
        return false
      }
    },
    [addPending, removePending, setError]
  )

  const isPending = useCallback((bib: string, gate?: number): boolean => {
    if (gate !== undefined) {
      return pendingByKey.current.has(`scoring-${bib}-${gate}`)
    }
    // Check if any operation for this bib is pending
    for (const key of pendingByKey.current.keys()) {
      if (key.includes(`-${bib}-`) || key.endsWith(`-${bib}`)) {
        return true
      }
    }
    return false
  }, [])

  return {
    ...state,
    setGatePenalty,
    removeFromCourse,
    sendTimingImpulse,
    isPending,
    clearError,
  }
}
