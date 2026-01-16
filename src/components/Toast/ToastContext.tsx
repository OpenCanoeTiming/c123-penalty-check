/**
 * Toast Context
 *
 * Provides a global toast notification system via React context.
 * Components can use the useToast hook to show notifications.
 */

import { createContext, useContext, useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContainer } from './ToastContainer'
import type { ToastData, ToastVariant } from './Toast'

interface ToastContextValue {
  showToast: (message: string, variant: ToastVariant, duration?: number) => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastIdCounter = 0

function generateToastId(): string {
  return `toast-${++toastIdCounter}-${Date.now()}`
}

export interface ToastProviderProps {
  children: ReactNode
  maxToasts?: number
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, variant: ToastVariant, duration?: number) => {
      const newToast: ToastData = {
        id: generateToastId(),
        message,
        variant,
        duration,
      }

      setToasts((prev) => {
        const updated = [...prev, newToast]
        // Remove oldest toasts if exceeding max
        if (updated.length > maxToasts) {
          return updated.slice(-maxToasts)
        }
        return updated
      })
    },
    [maxToasts]
  )

  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'success', duration)
    },
    [showToast]
  )

  const showError = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'error', duration)
    },
    [showToast]
  )

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'warning', duration)
    },
    [showToast]
  )

  const value: ToastContextValue = {
    showToast,
    showSuccess,
    showError,
    showWarning,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
