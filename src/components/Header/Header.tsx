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
  // Connection status
  isConnected: boolean
  // Actions
  onOpenSettings: () => void
}

export function Header({
  races,
  selectedRaceId,
  onSelectRace,
  isConnected,
  onOpenSettings,
}: HeaderProps) {
  return (
    <DSHeader variant="compact">
      <HeaderBrand>
        <HeaderTitle>C123-SCORING</HeaderTitle>
      </HeaderBrand>

      <div className={styles.raceSelector}>
        <RaceSelector
          races={races}
          selectedRaceId={selectedRaceId}
          onSelectRace={onSelectRace}
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
