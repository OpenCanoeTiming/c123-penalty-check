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

import { useRef, useEffect, useCallback, useMemo, useState, memo, type UIEvent } from 'react'
import type { C123ResultRow, C123RaceConfigData } from '../../types/c123server'
import type { GateGroup, ResultsSortOption } from '../../types/ui'
import type { PenaltyValue } from '../../types/scoring'
import { useFocusNavigation, useKeyboardInput, useMultiTap } from '../../hooks'
import { parseResultsGatesString } from '../../utils'
import { PenaltyContextMenu } from './PenaltyContextMenu'
import styles from './ResultsGrid.module.css'

/** Pre-parsed penalty values for a single row (parsed once, used for all cells) */
type ParsedPenalties = (number | null)[]

/** Props for memoized PenaltyCell component */
interface PenaltyCellProps {
  penalties: ParsedPenalties
  gateIndex: number
  colIndex: number
  rowIndex: number
  gateNumber: number
  competitorBib: string
  isReverse: boolean
  isFocused: boolean
  isColFocus: boolean
  isRowFocus: boolean
  isBoundary: boolean
  onCellClick: (e: React.MouseEvent, rowIndex: number, colIndex: number) => void
  onMouseDown: (e: React.MouseEvent, rowIndex: number, colIndex: number) => void
  onMouseUp: () => void
  onMouseLeave: () => void
  onTouchStart: (e: React.TouchEvent, rowIndex: number, colIndex: number) => void
  onTouchEnd: () => void
  onContextMenu: (e: React.MouseEvent, rowIndex: number, colIndex: number) => void
}

/** Memoized penalty cell - only re-renders when its specific props change */
const PenaltyCell = memo(function PenaltyCell({
  penalties,
  gateIndex,
  colIndex,
  rowIndex,
  gateNumber,
  competitorBib,
  isReverse,
  isFocused,
  isColFocus,
  isRowFocus,
  isBoundary,
  onCellClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
  onContextMenu,
}: PenaltyCellProps) {
  const pen = penalties[gateIndex]

  // Build class name based on penalty value
  let className = styles.penaltyCell
  let value = ''
  let penaltyLabel = 'empty'

  if (pen === 0) {
    className += ` ${styles.penaltyClear}`
    value = '0'
    penaltyLabel = 'clear'
  } else if (pen === 2) {
    className += ` ${styles.penaltyTouch}`
    value = '2'
    penaltyLabel = '2 seconds touch'
  } else if (pen === 50) {
    className += ` ${styles.penaltyMiss}`
    value = '50'
    penaltyLabel = '50 seconds miss'
  } else {
    className += ` ${styles.penaltyEmpty}`
  }

  if (isReverse) {
    className += ` ${styles.penaltyReverse}`
  }

  // Focus states
  if (isFocused) {
    className += ` ${styles.penaltyCellFocused}`
  } else if (isColFocus) {
    className += ` ${styles.penaltyCellColFocus}`
  } else if (isRowFocus) {
    className += ` ${styles.penaltyCellRowFocus}`
  }

  if (isBoundary) {
    className += ` ${styles.penaltyBoundary}`
  }

  // Build aria-label: "Gate 5, Bib 10, clear" or "Gate 5, Bib 10, empty"
  const ariaLabel = `Gate ${gateNumber}, Bib ${competitorBib}, ${penaltyLabel}`

  return (
    <td
      role="gridcell"
      aria-label={ariaLabel}
      tabIndex={isFocused ? 0 : -1}
      className={className}
      onClick={(e) => onCellClick(e, rowIndex, colIndex)}
      onMouseDown={(e) => onMouseDown(e, rowIndex, colIndex)}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={(e) => onTouchStart(e, rowIndex, colIndex)}
      onTouchEnd={onTouchEnd}
      onContextMenu={(e) => onContextMenu(e, rowIndex, colIndex)}
    >
      {value}
    </td>
  )
})

interface ResultsGridProps {
  rows: C123ResultRow[]
  raceConfig: C123RaceConfigData | null
  raceId: string | null
  activeGateGroup: GateGroup | null
  allGateGroups: GateGroup[]
  sortBy: ResultsSortOption
  onGroupSelect?: (groupId: string | null) => void
  onPenaltySubmit: (bib: string, gate: number, value: PenaltyValue, raceId?: string) => void
}

// Scroll constants for auto-scrolling focused cell into view
const SCROLL_PADDING = 4 // Padding when cell is at edge
const SCROLLBAR_WIDTH = 14 // Approximate scrollbar width
const SCROLL_BUFFER = 18 // Extra buffer to ensure visibility

// Long press duration for context menu (ms)
const LONG_PRESS_DURATION = 500

// Format time - display in seconds only
function formatTime(seconds: number | null | undefined): string {
  if (seconds == null) return ''
  return `${seconds.toFixed(2)}s`
}

// Calculate penalty total from pre-parsed penalties array
function calculatePenaltyTotal(penalties: ParsedPenalties): string {
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
  onPenaltySubmit,
}: ResultsGridProps) {
  // Refs for scroll sync
  const groupsHeaderRef = useRef<HTMLDivElement>(null)
  const colHeadersRef = useRef<HTMLDivElement>(null)
  const rowHeadersRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    row: number
    col: number
  } | null>(null)

  // Long press timer ref
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

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

  // Pre-parse penalties for all rows (once per row, not per cell)
  // Maps bib -> parsed penalties array
  const parsedPenaltiesMap = useMemo(() => {
    const map = new Map<string, ParsedPenalties>()
    for (const row of sortedRows) {
      map.set(row.bib, parseResultsGatesString(row.gates))
    }
    return map
  }, [sortedRows])

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
      scrollX = cellRect.left - contentRect.left - SCROLL_PADDING
    } else if (cellRect.right > contentRect.right - SCROLLBAR_WIDTH) {
      scrollX = cellRect.right - contentRect.right + SCROLL_BUFFER
    }

    if (cellRect.top < contentRect.top) {
      scrollY = cellRect.top - contentRect.top - SCROLL_PADDING
    } else if (cellRect.bottom > contentRect.bottom - SCROLLBAR_WIDTH) {
      scrollY = cellRect.bottom - contentRect.bottom + SCROLL_BUFFER
    }

    if (scrollX !== 0 || scrollY !== 0) {
      content.scrollBy({ left: scrollX, top: scrollY, behavior: 'auto' })
    }
  }, [position])

  // Auto-focus
  const hasRows = sortedRows.length > 0
  useEffect(() => {
    if (hasRows) {
      contentRef.current?.focus()
    }
  }, [hasRows])

  // Submit penalty for a specific cell
  const submitPenalty = useCallback(
    (rowIndex: number, colIndex: number, value: PenaltyValue) => {
      const row = sortedRows[rowIndex]
      if (!row) return
      const gateIndex = visibleGateIndices[colIndex]
      const gate = gateIndex + 1
      onPenaltySubmit(row.bib, gate, value, raceId ?? undefined)
    },
    [sortedRows, visibleGateIndices, onPenaltySubmit, raceId]
  )

  // Multi-tap handler: 1=select, 2=0, 3=2, 4=50
  const handleMultiTap = useCallback(
    (count: number, rowIndex: number, colIndex: number) => {
      // Always select the cell first
      setPosition({ row: rowIndex, column: colIndex })
      contentRef.current?.focus()

      // Apply penalty based on tap count
      switch (count) {
        case 2:
          submitPenalty(rowIndex, colIndex, 0)
          break
        case 3:
          submitPenalty(rowIndex, colIndex, 2)
          break
        case 4:
          submitPenalty(rowIndex, colIndex, 50)
          break
        // case 1: just select (no penalty change)
      }
    },
    [setPosition, submitPenalty]
  )

  // Use multi-tap hook
  const handleCellTap = useMultiTap(handleMultiTap)

  // Handle cell click - now uses multi-tap detection
  const handleCellClick = useCallback(
    (_e: React.MouseEvent, rowIndex: number, colIndex: number) => {
      // Ignore if long press was triggered
      if (longPressTriggered.current) {
        longPressTriggered.current = false
        return
      }
      handleCellTap(rowIndex, colIndex)
    },
    [handleCellTap]
  )

  // Clear long press timer
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // Long press / right-click opens context menu
  const openContextMenu = useCallback(
    (rowIndex: number, colIndex: number, x: number, y: number) => {
      setPosition({ row: rowIndex, column: colIndex })
      setContextMenu({ x, y, row: rowIndex, col: colIndex })
      longPressTriggered.current = true
    },
    [setPosition]
  )

  // Mouse down - start long press timer
  const handleCellMouseDown = useCallback(
    (e: React.MouseEvent, rowIndex: number, colIndex: number) => {
      if (e.button !== 0) return // Only left button
      clearLongPress()
      longPressTriggered.current = false
      longPressTimer.current = setTimeout(() => {
        openContextMenu(rowIndex, colIndex, e.clientX, e.clientY)
      }, LONG_PRESS_DURATION)
    },
    [clearLongPress, openContextMenu]
  )

  // Mouse up - clear long press timer
  const handleCellMouseUp = useCallback(() => {
    clearLongPress()
  }, [clearLongPress])

  // Mouse leave - clear long press timer
  const handleCellMouseLeave = useCallback(() => {
    clearLongPress()
  }, [clearLongPress])

  // Touch start - start long press timer
  const handleCellTouchStart = useCallback(
    (e: React.TouchEvent, rowIndex: number, colIndex: number) => {
      clearLongPress()
      longPressTriggered.current = false
      const touch = e.touches[0]
      longPressTimer.current = setTimeout(() => {
        openContextMenu(rowIndex, colIndex, touch.clientX, touch.clientY)
      }, LONG_PRESS_DURATION)
    },
    [clearLongPress, openContextMenu]
  )

  // Touch end - clear long press timer
  const handleCellTouchEnd = useCallback(() => {
    clearLongPress()
  }, [clearLongPress])

  // Right-click opens context menu
  const handleCellContextMenu = useCallback(
    (e: React.MouseEvent, rowIndex: number, colIndex: number) => {
      e.preventDefault()
      openContextMenu(rowIndex, colIndex, e.clientX, e.clientY)
    },
    [openContextMenu]
  )

  // Handle context menu selection
  const handleContextMenuSelect = useCallback(
    (value: PenaltyValue) => {
      if (contextMenu) {
        submitPenalty(contextMenu.row, contextMenu.col, value)
      }
    },
    [contextMenu, submitPenalty]
  )

  // Close context menu
  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null)
    contentRef.current?.focus()
  }, [])

  // Handle group click
  const handleGroupClick = useCallback((groupId: string) => {
    if (!onGroupSelect) return
    if (activeGateGroup?.id === groupId) {
      onGroupSelect(null) // Deselect
    } else {
      onGroupSelect(groupId)
    }
  }, [onGroupSelect, activeGateGroup])

  // Get current cell value for context menu
  const getContextMenuValue = (): PenaltyValue => {
    if (!contextMenu) return null
    const row = sortedRows[contextMenu.row]
    if (!row) return null
    const gateIndex = visibleGateIndices[contextMenu.col]
    const penalties = parsedPenaltiesMap.get(row.bib) ?? []
    const value = penalties[gateIndex]
    // Cast to PenaltyValue - in practice only 0, 2, 50, or null
    if (value === 0 || value === 2 || value === 50) return value
    return null
  }

  if (sortedRows.length === 0 || nrGates === 0) {
    return <div className={styles.gridContainer}>No data</div>
  }

  return (
    <div
      className={styles.gridContainer}
      role="grid"
      aria-label="Penalty grid"
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
                  <th
                    key={gateIndex}
                    className={className}
                    role="columnheader"
                    aria-label={`Gate ${gateNum}${isReverse ? ' (reverse)' : ''}`}
                  >
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
              const penalties = parsedPenaltiesMap.get(row.bib) ?? []
              const rowClasses = [
                isFocused && styles.focused,
                isDisabled && styles.disabled,
              ].filter(Boolean).join(' ')

              return (
                <tr key={row.bib} className={rowClasses || undefined} role="row">
                  <td className={styles.colBib} role="rowheader" aria-label={`Bib ${row.bib}`}>{row.bib}</td>
                  <td className={styles.colName}>{row.name}</td>
                  <td className={`${styles.colTime} ${isDisabled ? styles.colStatus : ''}`}>
                    {isDisabled ? row.status : formatTime(row.time ? parseFloat(row.time) : null)}
                  </td>
                  <td className={styles.colPen}>
                    {isDisabled ? '' : calculatePenaltyTotal(penalties)}
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
              const penalties = parsedPenaltiesMap.get(row.bib) ?? []
              return (
              <tr key={row.bib} className={isDisabled ? styles.disabled : undefined}>
                {visibleGateIndices.map((gateIndex, colIndex) => {
                  const gateNum = gateIndex + 1
                  const isFocused = rowIndex === position.row && colIndex === position.column
                  const isColFocus = colIndex === position.column && rowIndex !== position.row
                  const isRowFocus = rowIndex === position.row && colIndex !== position.column
                  const isBoundary = groupBoundaries.has(gateNum)
                  const isReverse = gateConfig[gateIndex] === 'R'

                  return (
                    <PenaltyCell
                      key={gateIndex}
                      penalties={penalties}
                      gateIndex={gateIndex}
                      colIndex={colIndex}
                      rowIndex={rowIndex}
                      gateNumber={gateNum}
                      competitorBib={row.bib}
                      isReverse={isReverse}
                      isFocused={isFocused}
                      isColFocus={isColFocus}
                      isRowFocus={isRowFocus}
                      isBoundary={isBoundary}
                      onCellClick={handleCellClick}
                      onMouseDown={handleCellMouseDown}
                      onMouseUp={handleCellMouseUp}
                      onMouseLeave={handleCellMouseLeave}
                      onTouchStart={handleCellTouchStart}
                      onTouchEnd={handleCellTouchEnd}
                      onContextMenu={handleCellContextMenu}
                    />
                  )
                })}
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <PenaltyContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          currentValue={getContextMenuValue()}
          onSelect={handleContextMenuSelect}
          onClose={handleContextMenuClose}
        />
      )}
    </div>
  )
}
