import type { ProcessedRace } from '../../hooks/useSchedule'
import styles from './RaceSelector.module.css'

interface RaceSelectorProps {
  races: ProcessedRace[]
  selectedRaceId: string | null
  onSelectRace: (raceId: string) => void
}

export function RaceSelector({ races, selectedRaceId, onSelectRace }: RaceSelectorProps) {
  if (races.length === 0) {
    return <span className={styles.noRaces}>No active races</span>
  }

  return (
    <div className={styles.selector}>
      <select
        className={styles.select}
        value={selectedRaceId ?? ''}
        onChange={(e) => onSelectRace(e.target.value)}
        aria-label="Select race"
      >
        <option value="" disabled>
          Select race...
        </option>
        {races.map((race) => (
          <option key={race.raceId} value={race.raceId}>
            {race.isRunning ? '▶ ' : ''}
            {race.shortTitle}
          </option>
        ))}
      </select>
      {selectedRaceId && (
        <RaceStatusIndicator
          race={races.find((r) => r.raceId === selectedRaceId)}
        />
      )}
    </div>
  )
}

interface RaceStatusIndicatorProps {
  race: ProcessedRace | undefined
}

function RaceStatusIndicator({ race }: RaceStatusIndicatorProps) {
  if (!race) return null

  const statusClass = race.isRunning
    ? styles.statusRunning
    : race.isFinished
      ? styles.statusFinished
      : styles.statusActive

  const statusText = race.isRunning
    ? 'Running'
    : race.isFinished
      ? 'Finished'
      : 'Active'

  return (
    <span className={`${styles.status} ${statusClass}`}>
      {statusText}
    </span>
  )
}
