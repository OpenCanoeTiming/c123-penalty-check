import { useMemo } from 'react'
import { Select, Button } from '@opencanoetiming/timing-design-system'
import { isProgressDone } from '../../hooks'
import type { ProcessedRace } from '../../hooks/useSchedule'
import styles from './RaceSelector.module.css'

/** Verification progress for one race: how many gates are checked, out of how many, and how many are under open dispute. */
interface RaceCheckState {
  checked: number
  total: number
  /** Open flags on gates that count toward progress - see RaceProgress.openFlags (src/hooks/useChecks.ts). */
  openFlags: number
}

interface RaceSelectorProps {
  races: ProcessedRace[]
  selectedRaceId: string | null
  onSelectRace: (raceId: string) => void
  onlyRunning: boolean
  onToggleOnlyRunning: () => void
  /** Per-race verification progress, keyed by raceId. Omit to show no indicator. */
  getRaceCheckState?: (raceId: string) => RaceCheckState
}

/**
 * Text suffix for the per-race verification indicator: nothing while there
 * is nothing to check yet, ` checked/total` while in progress, ` ✓` once
 * every gate is checked.
 *
 * Plain text, not markup: a native <select> never lays out an <option>'s
 * children - it paints only the option's flattened text - so an element
 * here (a <span> for styling or aria-label) would exist in the DOM but be
 * invisible and inaccessible, while React additionally logs invalid-nesting
 * errors for it. Returning a string sidesteps all of that; the "✓" and
 * "checked/total" reach the user (and assistive tech, via the option's own
 * accessible name) exactly the way they would anyway.
 *
 * "Done" is a presentation decision (tick vs. ratio), made from the raw
 * counts via the shared `isProgressDone` (src/hooks/useChecks.ts) rather
 * than a precomputed flag accepted as given: this indicator is the
 * operator's signal that a race is safe to finalize, so a false "done" is
 * the worst possible failure mode this feature can produce. `isProgressDone`
 * is the one place that verdict is decided - getRaceProgress's own `done`
 * and CheckProgress's footer-bar "complete" both call the same function on
 * the same shape of counts, so there is exactly one formula to get right,
 * not three that could individually drift. A race that is fully checked but
 * still has an open flag falls through to the ratio branch rather than the
 * tick - it is not done, and the ratio at least doesn't claim otherwise.
 */
function raceCheckIndicator(state: RaceCheckState | undefined): string {
  if (!state) return ''
  if (isProgressDone(state)) return ' ✓'
  if (state.total > 0) return ` ${state.checked}/${state.total}`
  return ''
}

export function RaceSelector({
  races,
  selectedRaceId,
  onSelectRace,
  onlyRunning,
  onToggleOnlyRunning,
  getRaceCheckState,
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
        {races.map((race) => {
          const indicator = getRaceCheckState ? raceCheckIndicator(getRaceCheckState(race.raceId)) : ''
          return (
            <option key={race.raceId} value={race.raceId}>
              {race.isRunning ? '● ' : ''}
              {race.displayTitle}
              {indicator}
            </option>
          )
        })}
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
