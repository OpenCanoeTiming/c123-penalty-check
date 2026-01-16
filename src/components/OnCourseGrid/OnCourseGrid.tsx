import { useRef, useEffect, useCallback, useMemo, Fragment, useState } from 'react'
import type { C123OnCourseCompetitor, C123RaceConfigData } from '../../types/c123server'
import type { GateGroup } from '../../types/ui'
import type { RemoveReason, ChannelPosition } from '../../types/scoring'
import {
  useFocusNavigation,
  useKeyboardInput,
  type PenaltyValue,
} from '../../hooks'
import { parseGatesWithConfig } from '../../utils/gates'
import { isGateInGroup } from '../../types/gateGroups'
import { GridCell } from './GridCell'
import { CompetitorActions } from '../CompetitorActions'
import './OnCourseGrid.css'

export interface OnCourseGridProps {
  competitors: C123OnCourseCompetitor[]
  raceConfig: C123RaceConfigData | null
  selectedRaceId: string | null
  /** Active gate group for filtering (null = all gates) */
  activeGateGroup?: GateGroup | null
  /** All available gate groups for detecting group boundaries */
  allGateGroups?: GateGroup[]
  /** Callback when a penalty is submitted */
  onPenaltySubmit?: (bib: string, gate: number, value: PenaltyValue) => void
  /** Check if a competitor is checked */
  isChecked?: (bib: string) => boolean
  /** Callback when a competitor's checked state changes */
  onToggleChecked?: (bib: string) => void
  /** Whether to show finished competitors (default: true) */
  showFinished?: boolean
  /** Whether to show on-course competitors (default: true) */
  showOnCourse?: boolean
  /** Callback when remove from course action is triggered */
  onRemoveFromCourse?: (bib: string, reason: RemoveReason) => void
  /** Callback when manual timing action is triggered */
  onTiming?: (bib: string, position: ChannelPosition) => void
  /** Whether C123 is connected (enables/disables actions) */
  isC123Connected?: boolean
}

export function OnCourseGrid({
  competitors,
  raceConfig,
  selectedRaceId,
  activeGateGroup = null,
  allGateGroups = [],
  onPenaltySubmit,
  isChecked,
  onToggleChecked,
  showFinished = true,
  showOnCourse = true,
  onRemoveFromCourse,
  onTiming,
  isC123Connected = true,
}: OnCourseGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const focusedCellRef = useRef<HTMLTableCellElement>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    bib: string
    name: string
    isOnCourse: boolean
    isFinished: boolean
    position: { x: number; y: number }
  } | null>(null)

  // Helper to check if competitor has finished (based on dtFinish, not completed flag)
  const hasFinished = (c: C123OnCourseCompetitor) =>
    c.dtFinish !== null && c.dtFinish !== ''

  // Filter competitors by selected race
  const filteredCompetitors = selectedRaceId
    ? competitors.filter((c) => c.raceId === selectedRaceId)
    : competitors

  // Separate finished and on-course competitors
  // Use dtFinish for detection: null/empty = on course, timestamp = finished
  const finishedCompetitors = showFinished
    ? filteredCompetitors
        .filter((c) => c.dtFinish !== null && c.dtFinish !== '')
        .sort((a, b) => a.rank - b.rank) // Sort finished by rank
    : []

  const onCourseCompetitors = showOnCourse
    ? filteredCompetitors
        .filter((c) => c.dtFinish === null || c.dtFinish === '')
        .sort((a, b) => a.position - b.position) // Sort on-course by position (1 = closest to finish)
    : []

  // Primary view: finished first, then on-course
  const sortedCompetitors = [...finishedCompetitors, ...onCourseCompetitors]
  const finishedCount = finishedCompetitors.length

  const nrGates = raceConfig?.nrGates ?? 0
  const gateConfig = raceConfig?.gateConfig ?? ''

  // Filter gate indices based on active group
  const visibleGateIndices = useMemo(() => {
    const allIndices = Array.from({ length: nrGates }, (_, i) => i)
    if (!activeGateGroup || activeGateGroup.gates.length === 0) {
      return allIndices
    }
    return allIndices.filter((i) => isGateInGroup(i + 1, activeGateGroup))
  }, [nrGates, activeGateGroup])

  // Create a mapping from visible column index to actual gate index
  const visibleColumnToGate = useMemo(() => {
    return visibleGateIndices.map((i) => i + 1) // 1-based gate numbers
  }, [visibleGateIndices])

  // Detect group boundaries for visual separators
  const groupBoundaries = useMemo(() => {
    const boundaries = new Set<number>()
    const customGroups = allGateGroups.filter((g) => g.gates.length > 0)

    if (customGroups.length === 0) return boundaries

    // For each visible gate, check if it's the last gate of any group
    for (let i = 0; i < visibleGateIndices.length - 1; i++) {
      const currentGate = visibleGateIndices[i] + 1
      const nextGate = visibleGateIndices[i + 1] + 1

      for (const group of customGroups) {
        const currentInGroup = group.gates.includes(currentGate)
        const nextInGroup = group.gates.includes(nextGate)

        // If current is in group but next is not, mark as boundary
        if (currentInGroup && !nextInGroup) {
          boundaries.add(currentGate)
        }
      }
    }

    return boundaries
  }, [visibleGateIndices, allGateGroups])

  // Focus navigation uses visible columns
  const {
    position,
    setPosition,
    handleKeyDown: handleNavKeyDown,
    isFocused,
    getCellId,
    activeCellId,
  } = useFocusNavigation({
    rowCount: sortedCompetitors.length,
    columnCount: visibleGateIndices.length,
  })

  // Get current competitor and gate info for keyboard input
  const currentCompetitor = sortedCompetitors[position.row]
  // Map visible column position to actual gate number
  const currentGate = visibleColumnToGate[position.column] ?? 1

  // Keyboard input for penalty values
  const {
    pendingValue,
    handleKeyDown: handleInputKeyDown,
  } = useKeyboardInput({
    enabled: sortedCompetitors.length > 0 && nrGates > 0,
    onPenaltyInput: (value) => {
      // Immediate submit on input
      if (!currentCompetitor || !onPenaltySubmit) return
      onPenaltySubmit(currentCompetitor.bib, currentGate, value)
    },
    onClear: () => {
      // Clear = set to 0
      if (!currentCompetitor || !onPenaltySubmit) return
      onPenaltySubmit(currentCompetitor.bib, currentGate, 0)
    },
  })

  // Handle context menu open
  const handleContextMenu = useCallback(
    (event: React.MouseEvent, competitor: C123OnCourseCompetitor) => {
      event.preventDefault()
      setContextMenu({
        bib: competitor.bib,
        name: competitor.name,
        isOnCourse: !hasFinished(competitor),
        isFinished: hasFinished(competitor),
        position: { x: event.clientX, y: event.clientY },
      })
    },
    []
  )

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Combined keyboard handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Close context menu on any key
      if (contextMenu) {
        setContextMenu(null)
      }

      // Competitor action shortcuts (D = DNS, F = DNF, C = CAP)
      if (currentCompetitor && onRemoveFromCourse && !hasFinished(currentCompetitor)) {
        const key = event.key.toUpperCase()
        if (key === 'D' && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault()
          // Open context menu for DNS confirmation
          setContextMenu({
            bib: currentCompetitor.bib,
            name: currentCompetitor.name,
            isOnCourse: true,
            isFinished: false,
            position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
          })
          return
        }
      }

      // First try input handling (numbers, enter, escape)
      if (handleInputKeyDown(event)) return

      // Then try navigation (arrows, home, end, etc)
      handleNavKeyDown(event)
    },
    [handleInputKeyDown, handleNavKeyDown, contextMenu, currentCompetitor, onRemoveFromCourse]
  )

  // Focus the grid when it mounts or when position changes
  useEffect(() => {
    if (focusedCellRef.current) {
      focusedCellRef.current.focus()
    }
  }, [position])

  // Handle cell click
  const handleCellClick = useCallback(
    (rowIndex: number, columnIndex: number) => {
      setPosition({ row: rowIndex, column: columnIndex })
      gridRef.current?.focus()
    },
    [setPosition]
  )

  if (sortedCompetitors.length === 0) {
    return (
      <div className="on-course-grid on-course-grid--empty">
        <p>No competitors on course</p>
      </div>
    )
  }

  return (
    <div
      ref={gridRef}
      className="on-course-grid"
      role="grid"
      aria-label="Penalty grid"
      aria-activedescendant={activeCellId ?? undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <table className="on-course-table">
        <thead>
          <tr role="row">
            <th className="col-check" role="columnheader">
              <span className="visually-hidden">Checked</span>
              ✓
            </th>
            <th className="col-pos" role="columnheader">#</th>
            <th className="col-bib" role="columnheader">Bib</th>
            <th className="col-name" role="columnheader">Name</th>
            <th className="col-time" role="columnheader">Time</th>
            <th className="col-pen" role="columnheader">Pen</th>
            {visibleGateIndices.map((gateIndex) => {
              const gateNum = gateIndex + 1
              const gateType = gateConfig[gateIndex] ?? 'N'
              const isBoundary = groupBoundaries.has(gateNum)
              return (
                <th
                  key={gateNum}
                  className={`col-gate ${gateType === 'R' ? 'gate-reverse' : 'gate-normal'} ${isBoundary ? 'gate-group-boundary' : ''}`}
                  role="columnheader"
                >
                  {gateNum}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sortedCompetitors.map((competitor, rowIndex) => {
            const penalties = parseGatesWithConfig(competitor.gates, gateConfig)
            const isOnCourseSection = rowIndex === finishedCount && onCourseCompetitors.length > 0

            return (
              <Fragment key={competitor.bib}>
                {/* Section separator between finished and on-course */}
                {isOnCourseSection && (
                  <tr key="section-separator" className="section-separator" role="presentation">
                    <td colSpan={6 + visibleGateIndices.length}>
                      <span className="section-label">On Course ({onCourseCompetitors.length})</span>
                    </td>
                  </tr>
                )}
                <tr
                  key={competitor.bib}
                  className={`competitor-row ${hasFinished(competitor) ? 'completed' : 'on-course'} ${isChecked?.(competitor.bib) ? 'row-checked' : ''}`}
                  role="row"
                  onContextMenu={(e) => handleContextMenu(e, competitor)}
                >
                  <td className="col-check" role="gridcell">
                    <button
                      type="button"
                      className={`check-button ${isChecked?.(competitor.bib) ? 'checked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleChecked?.(competitor.bib)
                      }}
                      aria-label={isChecked?.(competitor.bib) ? 'Uncheck' : 'Check'}
                      aria-pressed={isChecked?.(competitor.bib) ?? false}
                      disabled={!hasFinished(competitor)}
                      title={hasFinished(competitor) ? 'Toggle checked' : 'Can only check finished competitors'}
                    >
                      {isChecked?.(competitor.bib) ? '✓' : ''}
                    </button>
                  </td>
                  <td className="col-pos" role="gridcell">
                    {hasFinished(competitor) ? competitor.rank : competitor.position}
                  </td>
                  <td className="col-bib" role="gridcell">{competitor.bib}</td>
                  <td className="col-name" role="gridcell">
                    <span className="name">{competitor.name}</span>
                    <span className="club">{competitor.club}</span>
                  </td>
                  <td className="col-time" role="gridcell">{competitor.time}s</td>
                  <td className="col-pen" role="gridcell">
                    {competitor.pen > 0 ? `+${competitor.pen}` : ''}
                  </td>
                  {visibleGateIndices.map((gateIndex, visibleColIndex) => {
                    const gateNum = gateIndex + 1
                    const penalty = penalties.find((p) => p.gate === gateNum)
                    const cellIsFocused = isFocused(rowIndex, visibleColIndex)
                    const isBoundary = groupBoundaries.has(gateNum)

                    return (
                      <GridCell
                        key={gateNum}
                        ref={cellIsFocused ? focusedCellRef : undefined}
                        gate={gateNum}
                        value={(penalty?.value as PenaltyValue | null) ?? null}
                        pendingValue={cellIsFocused ? pendingValue : null}
                        gateType={(penalty?.type ?? gateConfig[gateIndex] ?? 'N') as 'N' | 'R'}
                        isFocused={cellIsFocused}
                        isGroupBoundary={isBoundary}
                        id={getCellId(rowIndex, visibleColIndex)}
                        onClick={() => handleCellClick(rowIndex, visibleColIndex)}
                      />
                    )
                  })}
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>

      {/* Context menu for competitor actions */}
      {contextMenu && (
        <CompetitorActions
          bib={contextMenu.bib}
          name={contextMenu.name}
          isOnCourse={contextMenu.isOnCourse}
          isFinished={contextMenu.isFinished}
          onRemove={onRemoveFromCourse}
          onTiming={onTiming}
          disabled={!isC123Connected}
          variant="menu"
          menuPosition={contextMenu.position}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  )
}
