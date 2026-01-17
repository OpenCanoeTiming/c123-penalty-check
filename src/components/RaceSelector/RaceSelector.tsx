import { Select, LiveBadge, Badge } from '@opencanoetiming/timing-design-system'
import type { ProcessedRace } from '../../hooks/useSchedule'

interface RaceSelectorProps {
  races: ProcessedRace[]
  selectedRaceId: string | null
  onSelectRace: (raceId: string) => void
}

export function RaceSelector({ races, selectedRaceId, onSelectRace }: RaceSelectorProps) {
  if (races.length === 0) {
    return (
      <Badge variant="neutral">
        No active races
      </Badge>
    )
  }

  const selectedRace = races.find((r) => r.raceId === selectedRaceId)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Select
        value={selectedRaceId ?? ''}
        onChange={(e) => onSelectRace(e.target.value)}
        aria-label="Select race"
        style={{ minWidth: '200px' }}
      >
        <option value="" disabled>
          Select race...
        </option>
        {races.map((race) => (
          <option key={race.raceId} value={race.raceId}>
            {race.isRunning ? '\u25B6 ' : ''}
            {race.shortTitle}
          </option>
        ))}
      </Select>
      {selectedRace?.isRunning && <LiveBadge />}
      {selectedRace && !selectedRace.isRunning && selectedRace.isFinished && (
        <Badge variant="info">Finished</Badge>
      )}
    </div>
  )
}
