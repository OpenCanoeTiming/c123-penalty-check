import {
  Button,
  Card,
  CardBody,
  CardTitle,
  CardSubtitle,
  type CardStatus,
} from '@opencanoetiming/timing-design-system'
import './EmptyState.css'

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

const defaultContent: Record<EmptyStateVariant, { icon: string; title: string; message: string; status?: CardStatus }> = {
  disconnected: {
    icon: '⚡',
    title: 'Not connected',
    message: 'Unable to connect to the timing server. Check your connection settings.',
    status: 'error',
  },
  'no-races': {
    icon: '📋',
    title: 'No active races',
    message: 'No races are currently active. Wait for a race to start or check the schedule.',
    status: 'info',
  },
  'no-competitors': {
    icon: '🏁',
    title: 'No competitors',
    message: 'No competitors on course or finished yet. Waiting for the race to begin.',
    status: 'info',
  },
  loading: {
    icon: '⏳',
    title: 'Loading',
    message: 'Connecting to the timing server...',
  },
  discovering: {
    icon: '🔍',
    title: 'Finding server',
    message: 'Scanning the network for C123 Server...',
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
    <div className="empty-state-wrapper" data-testid="empty-state" data-variant={variant}>
      <Card
        variant="elevated"
        padding="spacious"
        status={content.status}
        className={`empty-state-card empty-state-card--${variant}`}
      >
        <CardBody className="empty-state-card__body">
          <span className={`empty-state-card__icon ${variant === 'loading' || variant === 'discovering' ? 'empty-state-card__icon--pulse' : ''}`} aria-hidden="true">
            {content.icon}
          </span>
          <CardTitle as="h2" className="empty-state-card__title">
            {title ?? content.title}
          </CardTitle>
          <CardSubtitle className="empty-state-card__message">
            {message ?? content.message}
          </CardSubtitle>
          {action && (
            <Button
              variant="primary"
              data-testid="empty-state-action"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
