/**
 * Toast Container
 *
 * Renders all active toasts in a fixed position container.
 */

import { Toast } from './Toast'
import type { ToastData } from './Toast'
import './Toast.css'

export interface ToastContainerProps {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-container" aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
