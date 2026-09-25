import {
  Header as DSHeader,
  HeaderBrand,
  HeaderTitle,
  HeaderStatus,
  LiveBadge,
  Button,
} from '@opencanoetiming/timing-design-system'
import { RaceSelector } from '../RaceSelector'
import type { ProcessedRace } from '../../hooks/useSchedule'
import styles from './Header.module.css'

interface HeaderProps {
  // Race selection
  races: ProcessedRace[]
  selectedRaceId: string | null
  onSelectRace: (raceId: string) => void
  // Filter
  onlyRunning: boolean
  onToggleOnlyRunning: () => void
  // Connection status
  isConnected: boolean
  // Actions
  onOpenSettings: () => void
  /** Per-race verification progress, keyed by raceId. Omit to show no indicator. */
  getRaceCheckState?: (raceId: string) => { checked: number; total: number; openFlags: number } | null
}

export function Header({
  races,
  selectedRaceId,
  onSelectRace,
  onlyRunning,
  onToggleOnlyRunning,
  isConnected,
  onOpenSettings,
  getRaceCheckState,
}: HeaderProps) {
  return (
    <DSHeader variant="compact">
      <HeaderBrand>
        <HeaderTitle>C123-PENALTY-CHECK</HeaderTitle>
      </HeaderBrand>

      <div className={styles.raceSelector}>
        <RaceSelector
          races={races}
          selectedRaceId={selectedRaceId}
          onSelectRace={onSelectRace}
          onlyRunning={onlyRunning}
          onToggleOnlyRunning={onToggleOnlyRunning}
          getRaceCheckState={getRaceCheckState}
        />
      </div>

      <HeaderStatus>
        {isConnected && <LiveBadge />}
        <Button
          variant="ghost"
          size="sm"
          icon
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings (Ctrl+,)"
          style={{ fontSize: '1.25rem' }}
        >
          ⚙
        </Button>
      </HeaderStatus>
    </DSHeader>
  )
}
