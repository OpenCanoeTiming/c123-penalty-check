import './EmptyState.css'

export type EmptyStateVariant = 'disconnected' | 'no-races' | 'no-competitors' | 'loading'

export interface EmptyStateProps {
  variant: EmptyStateVariant
  title?: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
}

const defaultContent: Record<EmptyStateVariant, { icon: string; title: string; message: string }> = {
  disconnected: {
    icon: '⚡',
    title: 'Not connected',
    message: 'Unable to connect to the timing server. Check your connection settings.',
  },
  'no-races': {
    icon: '📋',
    title: 'No active races',
    message: 'No races are currently active. Wait for a race to start or check the schedule.',
  },
  'no-competitors': {
    icon: '🏁',
    title: 'No competitors',
    message: 'No competitors on course or finished yet. Waiting for the race to begin.',
  },
  loading: {
    icon: '⏳',
    title: 'Loading',
    message: 'Connecting to the timing server...',
  },
}

export function EmptyState({
  variant,
  title,
  message,
  action,
}: EmptyStateProps) {
  const content = defaultContent[variant]

  return (
    <div className={`empty-state empty-state--${variant}`}>
      <span className="empty-state__icon" aria-hidden="true">
        {content.icon}
      </span>
      <h2 className="empty-state__title">{title ?? content.title}</h2>
      <p className="empty-state__message">{message ?? content.message}</p>
      {action && (
        <button
          type="button"
          className="empty-state__action"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
