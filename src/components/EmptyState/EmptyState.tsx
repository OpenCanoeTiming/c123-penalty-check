import {
  Button,
  EmptyState as DsEmptyState,
  type EmptyStateProps as DsEmptyStateProps,
} from '@opencanoetiming/timing-design-system'

export type EmptyStateVariant = 'disconnected' | 'no-races' | 'no-competitors' | 'loading' | 'discovering'

export interface EmptyStateProps {
  variant: EmptyStateVariant
  title?: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
}

interface VariantContent {
  icon: string
  title: string
  message: string
  tone: DsEmptyStateProps['tone']
  /** Pulsing icon while something is still in progress */
  busy: boolean
}

const defaultContent: Record<EmptyStateVariant, VariantContent> = {
  disconnected: {
    icon: '⚡',
    title: 'Not connected',
    message: 'Unable to connect to the timing server. Check your connection settings.',
    tone: 'error',
    busy: false,
  },
  'no-races': {
    icon: '📋',
    title: 'No active races',
    message: 'No races are currently active. Wait for a race to start or check the schedule.',
    tone: 'info',
    busy: false,
  },
  'no-competitors': {
    icon: '🏁',
    title: 'No competitors',
    message: 'No competitors on course or finished yet. Waiting for the race to begin.',
    tone: 'info',
    busy: false,
  },
  loading: {
    icon: '⏳',
    title: 'Loading',
    message: 'Connecting to the timing server...',
    tone: 'neutral',
    busy: true,
  },
  discovering: {
    icon: '🔍',
    title: 'Finding server',
    message: 'Scanning the network for C123 Server...',
    tone: 'info',
    busy: true,
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
    <DsEmptyState
      data-testid="empty-state"
      data-variant={variant}
      icon={content.icon}
      title={title ?? content.title}
      tone={content.tone}
      busy={content.busy}
      card
      fill
      actions={
        action && (
          <Button
            variant="primary"
            data-testid="empty-state-action"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )
      }
    >
      {message ?? content.message}
    </DsEmptyState>
  )
}
