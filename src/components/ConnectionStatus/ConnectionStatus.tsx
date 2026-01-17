import { StatusIndicator } from '@opencanoetiming/timing-design-system'
import type { ConnectionStatus as ConnectionStatusType } from '../../hooks/useConnectionStatus'

interface ConnectionStatusProps {
  status: ConnectionStatusType
  serverUrl?: string
  showDetails?: boolean
}

// Map internal status classes to DS StatusIndicator status
function mapStatusToIndicator(
  statusClass: ConnectionStatusType['statusClass']
): 'connected' | 'connecting' | 'disconnected' {
  switch (statusClass) {
    case 'success':
      return 'connected'
    case 'warning':
    case 'connecting':
      return 'connecting'
    case 'error':
    case 'neutral':
    default:
      return 'disconnected'
  }
}

export function ConnectionStatus({
  status,
  serverUrl,
  showDetails = false,
}: ConnectionStatusProps) {
  const indicatorStatus = mapStatusToIndicator(status.statusClass)

  // Build label with optional details
  let label = status.statusText
  if (showDetails) {
    const details: string[] = []
    if (serverUrl) {
      details.push(serverUrl)
    }
    if (status.latency !== null && status.isHealthy) {
      details.push(formatLatency(status.latency))
    }
    if (details.length > 0) {
      label = `${status.statusText} (${details.join(' / ')})`
    }
  }

  return (
    <StatusIndicator
      label={label}
      status={indicatorStatus}
      data-testid="connection-status"
      data-status={status.statusClass}
    />
  )
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
