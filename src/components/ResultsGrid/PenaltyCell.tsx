import { forwardRef } from 'react'
import { TableCell } from '@opencanoetiming/timing-design-system/react'
import type { PenaltyValue } from '../../hooks'
import { formatPenalty } from '../../utils/gates'

export interface PenaltyCellProps {
  /** Gate number (1-based) */
  gate: number
  /** Current penalty value */
  value: PenaltyValue | null
  /** Pending value (being edited) */
  pendingValue?: PenaltyValue | null
  /** Gate type (N = normal, R = reverse) */
  gateType: 'N' | 'R'
  /** Whether this cell has focus */
  isFocused: boolean
  /** Whether this cell is at a group boundary (shows right border) */
  isGroupBoundary?: boolean
  /** Cell ID for accessibility */
  id: string
  /** Click handler */
  onClick?: () => void
}

function getPenaltyModifier(value: PenaltyValue | null): string {
  if (value === null) return 'penalty-cell--empty'
  if (value === 0) return 'penalty-cell--clear'
  if (value === 2) return 'penalty-cell--touch'
  if (value === 50) return 'penalty-cell--miss'
  return 'penalty-cell--empty'
}

/**
 * Individual gate cell in the penalty grid
 *
 * Displays:
 * - Current penalty value with color coding
 * - Focus ring when selected
 * - Pending value during editing
 */
export const PenaltyCell = forwardRef<HTMLTableCellElement, PenaltyCellProps>(
  function PenaltyCell(
    { gate, value, pendingValue, gateType, isFocused, isGroupBoundary, id, onClick },
    ref
  ) {
    const displayValue = pendingValue ?? value
    const penaltyClass = getPenaltyModifier(displayValue)

    const classNames = [
      'penalty-cell',
      penaltyClass,
      gateType === 'R' && 'penalty-cell--reverse',
      isFocused && 'penalty-cell--focused',
      pendingValue !== null && 'penalty-cell--pending',
      isGroupBoundary && 'penalty-cell--boundary',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <TableCell
        ref={ref}
        id={id}
        className={classNames}
        role="gridcell"
        aria-selected={isFocused}
        aria-label={`Gate ${gate}: ${displayValue !== null ? formatPenalty(displayValue) : 'empty'}`}
        tabIndex={isFocused ? 0 : -1}
        onClick={onClick}
        data-gate={gate}
      >
        {formatPenalty(displayValue)}
      </TableCell>
    )
  }
)
