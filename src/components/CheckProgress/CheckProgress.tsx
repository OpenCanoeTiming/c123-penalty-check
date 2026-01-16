import type { CheckProgress as CheckProgressType } from '../../types/scoring'
import './CheckProgress.css'

export interface CheckProgressProps {
  /** Progress data */
  progress: CheckProgressType
  /** Optional label */
  label?: string
  /** Show percentage text */
  showPercentage?: boolean
  /** Compact mode (smaller) */
  compact?: boolean
}

export function CheckProgress({
  progress,
  label = 'Checked',
  showPercentage = true,
  compact = false,
}: CheckProgressProps) {
  const { checked, total, percentage } = progress

  // Don't show if no competitors to check
  if (total === 0) {
    return null
  }

  const isComplete = checked === total

  return (
    <div className={`check-progress ${compact ? 'check-progress--compact' : ''} ${isComplete ? 'check-progress--complete' : ''}`}>
      <span className="check-progress__label">{label}</span>
      <div className="check-progress__bar-container">
        <div
          className="check-progress__bar"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={checked}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${checked} of ${total} checked`}
        />
      </div>
      <span className="check-progress__text">
        {checked}/{total}
        {showPercentage && <span className="check-progress__percentage"> ({percentage}%)</span>}
      </span>
    </div>
  )
}
