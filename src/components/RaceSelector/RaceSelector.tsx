import { useMemo } from 'react'
import { Select, Button } from '@opencanoetiming/timing-design-system'
import type { ProcessedRace } from '../../hooks/useSchedule'
import styles from './RaceSelector.module.css'

interface RaceSelectorProps {
  races: ProcessedRace[]
  selectedRaceId: string | null
  onSelectRace: (raceId: string) => void
  onlyRunning: boolean
  onToggleOnlyRunning: () => void
}

export function RaceSelector({
  races,
  selectedRaceId,
  onSelectRace,
  onlyRunning,
  onToggleOnlyRunning,
}: RaceSelectorProps) {
  // Find current index in races array
  const currentIndex = useMemo(() => {
    if (!selectedRaceId) return -1
    return races.findIndex((r) => r.raceId === selectedRaceId)
  }, [races, selectedRaceId])

  // Previous and next races
  const prevRace = currentIndex > 0 ? races[currentIndex - 1] : null
  const nextRace = currentIndex < races.length - 1 ? races[currentIndex + 1] : null

  const handlePrev = () => {
    if (prevRace) {
      onSelectRace(prevRace.raceId)
    }
  }

  const handleNext = () => {
    if (nextRace) {
      onSelectRace(nextRace.raceId)
    }
  }

  // Check if any race is running (to show/enable checkbox)
  const hasRunningRaces = races.some((r) => r.isRunning)

  if (races.length === 0) {
    return (
      <div className={styles.selector}>
        <span className={styles.noRaces}>
          {onlyRunning ? 'No running races' : 'No races'}
        </span>
      </div>
    )
  }

  return (
    <div className={styles.selector}>
      {/* Previous arrow */}
      <Button
        variant="ghost"
        size="sm"
        icon
        onClick={handlePrev}
        disabled={!prevRace}
        aria-label={prevRace ? `Previous: ${prevRace.displayTitle}` : 'No previous race'}
        title={prevRace ? `Previous: ${prevRace.displayTitle}` : undefined}
        className={styles.navButton}
      >
        ◀
      </Button>

      {/* Race dropdown */}
      <Select
        size="sm"
        value={selectedRaceId ?? ''}
        onChange={(e) => onSelectRace(e.target.value)}
        aria-label="Select race"
        className={styles.select}
      >
        <option value="" disabled>
          Select race...
        </option>
        {races.map((race) => (
          <option key={race.raceId} value={race.raceId}>
            {race.isRunning ? '● ' : ''}
            {race.displayTitle}
          </option>
        ))}
      </Select>

      {/* Next arrow */}
      <Button
        variant="ghost"
        size="sm"
        icon
        onClick={handleNext}
        disabled={!nextRace}
        aria-label={nextRace ? `Next: ${nextRace.displayTitle}` : 'No next race'}
        title={nextRace ? `Next: ${nextRace.displayTitle}` : undefined}
        className={styles.navButton}
      >
        ▶
      </Button>

      {/* Only running filter */}
      {hasRunningRaces && (
        <label className={styles.filterLabel} title="Show only currently running races">
          <input
            type="checkbox"
            checked={onlyRunning}
            onChange={onToggleOnlyRunning}
            className={styles.filterCheckbox}
          />
          <span className={styles.filterText}>Only running</span>
        </label>
      )}

      {/* Next race label (visible on wider screens) */}
      {nextRace && (
        <span className={styles.nextLabel} title={`Next: ${nextRace.displayTitle}`}>
          {nextRace.displayTitle}
        </span>
      )}
    </div>
  )
}
