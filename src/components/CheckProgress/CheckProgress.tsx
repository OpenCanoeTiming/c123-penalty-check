import { ProgressBar } from '@opencanoetiming/timing-design-system'
import { isProgressDone } from '../../hooks'
import type { CheckProgress as CheckProgressType } from '../../types/scoring'
import './CheckProgress.css'

export interface CheckProgressProps {
  /** Progress data */
  progress: CheckProgressType
  /** Optional label */
  label?: string
  /** Compact mode (smaller) */
  compact?: boolean
}

export function CheckProgress({
  progress,
  label = 'Checked',
  compact = false,
}: CheckProgressProps) {
  const { checked, total } = progress

  // Don't show if no competitors to check
  if (total === 0) {
    return null
  }

  // Same verdict as the race-switcher tick (RaceSelector.tsx) - both call
  // isProgressDone (src/hooks/useChecks.ts) instead of each keeping their
  // own "checked === total" copy, so a race with an unresolved flag can't
  // render green here while the switcher withholds its own tick right next
  // to it.
  const isComplete = isProgressDone(progress)

  return (
    <div className={`check-progress ${compact ? 'check-progress--compact' : ''}`}>
      <span className="check-progress__label">{label}</span>
      {/* No DS `label`: it stacks a progress-row above the track, and this
          is one inline footer row. The visible label stays ours. */}
      <ProgressBar
        value={(checked / total) * 100}
        tone={isComplete ? 'success' : 'accent'}
        size={compact ? 'sm' : 'md'}
        ariaLabel={label}
        className="check-progress__bar"
      />
      <span className={`check-progress__text ${isComplete ? 'check-progress__text--complete' : ''}`}>
        {checked}/{total}
      </span>
    </div>
  )
}
