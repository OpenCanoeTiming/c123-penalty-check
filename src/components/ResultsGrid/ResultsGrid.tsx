/**
 * ResultsGrid - 4-quadrant layout with synced scrolling
 *
 * Layout:
 * +------------------------+------------------------+
 * | CORNER (fixed)         | COL HEADERS (h-sync)   |
 * | #, Bib, Name, Time, Pen| Gate numbers           |
 * +------------------------+------------------------+
 * | ROW HEADERS (v-sync)   | CONTENT (scrolls)      |
 * | Competitor info        | Penalty cells          |
 * +------------------------+------------------------+
 */

import { useRef, useEffect, useCallback, useMemo, type UIEvent } from 'react'
import type { C123ResultRow, C123RaceConfigData } from '../../types/c123server'
import type { GateGroup, ResultsSortOption } from '../../types/ui'
import type { PenaltyValue } from '../../types/scoring'
import { useFocusNavigation } from '../../hooks/useFocusNavigation'
import { useKeyboardInput } from '../../hooks/useKeyboardInput'
import { parseResultsGatesString } from '../../utils/gates'
import styles from './ResultsGrid.module.css'

interface ResultsGridProps {
  rows: C123ResultRow[]
  raceConfig: C123RaceConfigData | null
  raceId: string | null
  activeGateGroup: GateGroup | null
  allGateGroups: GateGroup[]
  sortBy: ResultsSortOption
  showStartTime?: boolean
  onGroupSelect?: (groupId: string | null) => void
  onPenaltySubmit: (bib: string, gate: number, value: PenaltyValue, raceId?: string) => void
}

// Format time - display in seconds only
function formatTime(seconds: number | null | undefined): string {
  if (seconds == null) return ''
  return `${seconds.toFixed(2)}s`
}

// Calculate and format penalty total from gates string
function calculatePenaltyFromGates(gates: string): string {
  const penalties = parseResultsGatesString(gates)
  const total = penalties.reduce<number>((sum, p) => sum + (p ?? 0), 0)
  if (total === 0) return ''
  return `+${total}`
}

export function ResultsGrid({
  rows,
  raceConfig,
  raceId,
  activeGateGroup,
  allGateGroups,
  sortBy,
  onGroupSelect,
  // showStartTime = false, // TODO: implement
  onPenaltySubmit,
}: ResultsGridProps) {
  // Refs for scroll sync
  const groupsHeaderRef = useRef<HTMLDivElement>(null)
  const colHeadersRef = useRef<HTMLDivElement>(null)
  const rowHeadersRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Filter gate groups (exclude 'all' group)
  const customGroups = useMemo(() =>
    allGateGroups.filter((g) => g.id !== 'all' && g.gates.length > 0),
    [allGateGroups]
  )

  // Race config
  const nrGates = raceConfig?.nrGates ?? 0
  const gateConfig = raceConfig?.gateConfig ?? ''

  // Visible gates (filtered by active group)
  const visibleGateIndices = useMemo(() => {
    if (!activeGateGroup || activeGateGroup.gates.length === 0) {
      return Array.from({ length: nrGates }, (_, i) => i)
    }
    return activeGateGroup.gates.map((g) => g - 1).filter((i) => i >= 0 && i < nrGates)
  }, [activeGateGroup, nrGates])

  // Detect group boundaries for visual separators
  const groupBoundaries = useMemo(() => {
    const boundaries = new Set<number>()
    if (customGroups.length === 0) return boundaries

    for (let i = 0; i < visibleGateIndices.length - 1; i++) {
      const currentGate = visibleGateIndices[i] + 1
      const nextGate = visibleGateIndices[i + 1] + 1

      for (const group of customGroups) {
        const currentInGroup = group.gates.includes(currentGate)
        const nextInGroup = group.gates.includes(nextGate)

        if (currentInGroup && !nextInGroup) {
          boundaries.add(currentGate)
        }
      }
    }

    return boundaries
  }, [visibleGateIndices, customGroups])

  // Sort rows
  const sortedRows = useMemo(() => {
    const sorted = [...rows]
    switch (sortBy) {
      case 'startOrder':
        sorted.sort((a, b) => (a.startOrder ?? 999) - (b.startOrder ?? 999))
        break
      case 'bib':
        sorted.sort((a, b) => parseInt(a.bib) - parseInt(b.bib))
        break
      case 'rank':
      default:
        sorted.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
        break
    }
    return sorted
  }, [rows, sortBy])

  // Focus navigation
  const {
    position,
    setPosition,
    handleKeyDown: handleNavKeyDown,
  } = useFocusNavigation({
    rowCount: sortedRows.length,
    columnCount: visibleGateIndices.length,
  })

  // Check if current row is disabled (DNS/DNF/DSQ)
  const isRowDisabled = useCallback((row: C123ResultRow) => {
    return !!row.status
  }, [])

  // Keyboard input for penalty values
  const { handleKeyDown: handleInputKeyDown } = useKeyboardInput({
    onPenaltyInput: (value: PenaltyValue) => {
      const row = sortedRows[position.row]
      if (!row) return
      const gateIndex = visibleGateIndices[position.column]
      const gate = gateIndex + 1
      onPenaltySubmit(row.bib, gate, value, raceId ?? undefined)
    },
    onClear: () => {
      const row = sortedRows[position.row]
      if (!row) return
      const gateIndex = visibleGateIndices[position.column]
      const gate = gateIndex + 1
      onPenaltySubmit(row.bib, gate, null, raceId ?? undefined)
    },
  })

  // Combined keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const inputHandled = handleInputKeyDown(e)
      if (!inputHandled) {
        handleNavKeyDown(e)
      }
    },
    [handleInputKeyDown, handleNavKeyDown]
  )

  // Scroll sync
  const handleContentScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    if (groupsHeaderRef.current) {
      groupsHeaderRef.current.scrollLeft = target.scrollLeft
    }
    if (colHeadersRef.current) {
      colHeadersRef.current.scrollLeft = target.scrollLeft
    }
    if (rowHeadersRef.current) {
      rowHeadersRef.current.scrollTop = target.scrollTop
    }
  }, [])

  // Scroll focused cell into view
  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const cell = content.querySelector(`.${styles.penaltyCellFocused}`) as HTMLElement
    if (!cell) return

    const cellRect = cell.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()

    let scrollX = 0
    let scrollY = 0

    if (cellRect.left < contentRect.left) {
      scrollX = cellRect.left - contentRect.left - 4
    } else if (cellRect.right > contentRect.right - 14) {
      scrollX = cellRect.right - contentRect.right + 18
    }

    if (cellRect.top < contentRect.top) {
      scrollY = cellRect.top - contentRect.top - 4
    } else if (cellRect.bottom > contentRect.bottom - 14) {
      scrollY = cellRect.bottom - contentRect.bottom + 18
    }

    if (scrollX !== 0 || scrollY !== 0) {
      content.scrollBy({ left: scrollX, top: scrollY, behavior: 'auto' })
    }
  }, [position])

  // Auto-focus
  useEffect(() => {
    if (sortedRows.length > 0) {
      contentRef.current?.focus()
    }
  }, [sortedRows.length > 0])

  // Get penalty value for display
  const getPenaltyDisplay = (row: C123ResultRow, gateIndex: number): { value: string; className: string } => {
    const penalties = parseResultsGatesString(row.gates)
    const pen = penalties[gateIndex]
    const isReverse = gateConfig[gateIndex] === 'R'

    let className = styles.penaltyCell
    let value = ''

    if (pen === 0) {
      className += ` ${styles.penaltyClear}`
      value = '0'
    } else if (pen === 2) {
      className += ` ${styles.penaltyTouch}`
      value = '2'
    } else if (pen === 50) {
      className += ` ${styles.penaltyMiss}`
      value = '50'
    } else {
      className += ` ${styles.penaltyEmpty}`
    }

    if (isReverse) {
      className += ` ${styles.penaltyReverse}`
    }

    return { value, className }
  }

  // Handle cell click
  const handleCellClick = useCallback((rowIndex: number, colIndex: number) => {
    setPosition({ row: rowIndex, column: colIndex })
    contentRef.current?.focus()
  }, [setPosition])

  if (sortedRows.length === 0 || nrGates === 0) {
    return <div className={styles.gridContainer}>No data</div>
  }

  // Handle group click
  const handleGroupClick = useCallback((groupId: string) => {
    if (!onGroupSelect) return
    if (activeGateGroup?.id === groupId) {
      onGroupSelect(null) // Deselect
    } else {
      onGroupSelect(groupId)
    }
  }, [onGroupSelect, activeGateGroup])

  return (
    <div
      className={styles.gridContainer}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* GATE GROUPS - Row 1 (always render for consistent grid) */}
      <div className={styles.groupsCorner} />
      <div className={styles.groupsHeader} ref={groupsHeaderRef}>
        {customGroups.length > 0 && visibleGateIndices.map((gateIndex) => {
          const gateNum = gateIndex + 1
          const group = customGroups.find((g) => g.gates.includes(gateNum))
          const isFirstInGroup = group && group.gates[0] === gateNum
          const isActive = group && activeGateGroup?.id === group.id

          if (isFirstInGroup) {
            return (
              <button
                key={gateIndex}
                className={`${styles.groupBtn} ${isActive ? styles.groupBtnActive : ''}`}
                onClick={() => handleGroupClick(group.id)}
                style={{ flex: `0 0 ${group.gates.length * 36}px` }}
                title={`${group.name}: Gates ${group.gates.join(', ')}`}
              >
                {group.name}
              </button>
            )
          }
          if (group) return null
          return <div key={gateIndex} className={styles.groupBtn} style={{ visibility: 'hidden' }} />
        })}
      </div>

      {/* CORNER - Fixed column headers */}
      <div className={styles.corner}>
        <table>
          <thead>
            <tr>
              <th className={styles.colBib}>Bib</th>
              <th className={styles.colName}>Name</th>
              <th className={styles.colTime}>Time</th>
              <th className={styles.colPen}>Pen</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* COLUMN HEADERS - Gate numbers */}
      <div className={styles.colHeaders} ref={colHeadersRef}>
        <table>
          <thead>
            <tr>
              {visibleGateIndices.map((gateIndex, colIndex) => {
                const gateNum = gateIndex + 1
                const isReverse = gateConfig[gateIndex] === 'R'
                const isFocused = colIndex === position.column
                const isBoundary = groupBoundaries.has(gateNum)

                let className = ''
                if (isReverse) className += ` ${styles.reverse}`
                if (isFocused) className += ` ${styles.focused}`
                if (isBoundary) className += ` ${styles.boundary}`

                return (
                  <th key={gateIndex} className={className}>
                    {gateNum}
                  </th>
                )
              })}
              {/* Spacer for scrollbar */}
              <th className={styles.scrollbarSpacer} />
            </tr>
          </thead>
        </table>
      </div>

      {/* ROW HEADERS - Competitor info */}
      <div className={styles.rowHeaders} ref={rowHeadersRef}>
        <table>
          <tbody>
            {sortedRows.map((row, rowIndex) => {
              const isFocused = rowIndex === position.row
              const isDisabled = isRowDisabled(row)
              const rowClasses = [
                isFocused && styles.focused,
                isDisabled && styles.disabled,
              ].filter(Boolean).join(' ')

              return (
                <tr key={row.bib} className={rowClasses || undefined}>
                  <td className={styles.colBib}>{row.bib}</td>
                  <td className={styles.colName}>{row.name}</td>
                  <td className={`${styles.colTime} ${isDisabled ? styles.colStatus : ''}`}>
                    {isDisabled ? row.status : formatTime(row.time ? parseFloat(row.time) : null)}
                  </td>
                  <td className={styles.colPen}>
                    {isDisabled ? '' : calculatePenaltyFromGates(row.gates)}
                  </td>
                </tr>
              )
            })}
            {/* Spacer row for scrollbar */}
            <tr className={styles.scrollbarSpacerRow}>
              <td colSpan={4} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* CONTENT - Penalty cells */}
      <div
        className={styles.content}
        ref={contentRef}
        onScroll={handleContentScroll}
        tabIndex={-1}
      >
        <table>
          <tbody>
            {sortedRows.map((row, rowIndex) => {
              const isDisabled = isRowDisabled(row)
              return (
              <tr key={row.bib} className={isDisabled ? styles.disabled : undefined}>
                {visibleGateIndices.map((gateIndex, colIndex) => {
                  const { value, className } = getPenaltyDisplay(row, gateIndex)
                  const gateNum = gateIndex + 1
                  const isFocused = rowIndex === position.row && colIndex === position.column
                  const isColFocus = colIndex === position.column && rowIndex !== position.row
                  const isRowFocus = rowIndex === position.row && colIndex !== position.column
                  const isBoundary = groupBoundaries.has(gateNum)

                  let cellClass = className
                  if (isFocused) {
                    cellClass += ` ${styles.penaltyCellFocused}`
                  } else if (isColFocus && isRowFocus) {
                    cellClass += ` ${styles.penaltyCellCrosshair}`
                  } else if (isColFocus) {
                    cellClass += ` ${styles.penaltyCellColFocus}`
                  } else if (isRowFocus) {
                    cellClass += ` ${styles.penaltyCellRowFocus}`
                  }
                  if (isBoundary) {
                    cellClass += ` ${styles.penaltyBoundary}`
                  }

                  return (
                    <td
                      key={gateIndex}
                      className={cellClass}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                    >
                      {value}
                    </td>
                  )
                })}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  )
}
