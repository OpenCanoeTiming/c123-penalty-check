/**
 * Toast Component
 *
 * Displays notification messages with auto-dismiss functionality.
 * Supports success, error, and warning variants.
 */

import { useEffect, useCallback } from 'react'
import './Toast.css'

export type ToastVariant = 'success' | 'error' | 'warning'

export interface ToastData {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

export interface ToastProps extends ToastData {
  onDismiss: (id: string) => void
}

const DEFAULT_DURATION = 4000
const ERROR_DURATION = 6000

function getIcon(variant: ToastVariant): string {
  switch (variant) {
    case 'success':
      return '✓'
    case 'error':
      return '✕'
    case 'warning':
      return '!'
  }
}

export function Toast({ id, message, variant, duration, onDismiss }: ToastProps) {
  const autoDismissDuration =
    duration ?? (variant === 'error' ? ERROR_DURATION : DEFAULT_DURATION)

  const handleDismiss = useCallback(() => {
    onDismiss(id)
  }, [id, onDismiss])

  useEffect(() => {
    const timer = setTimeout(handleDismiss, autoDismissDuration)
    return () => clearTimeout(timer)
  }, [autoDismissDuration, handleDismiss])

  return (
    <div
      className={`toast toast-${variant}`}
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <span className="toast-icon" aria-hidden="true">
        {getIcon(variant)}
      </span>
      <span className="toast-message">{message}</span>
      <button
        className="toast-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  )
}
