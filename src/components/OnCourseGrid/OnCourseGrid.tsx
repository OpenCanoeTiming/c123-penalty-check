import { useRef, useEffect, useCallback, useMemo } from 'react'
import type { C123OnCourseCompetitor, C123RaceConfigData } from '../../types/c123server'
import type { GateGroup } from '../../types/ui'
import {
  useFocusNavigation,
  useKeyboardInput,
  type PenaltyValue,
} from '../../hooks'
import { parseGatesWithConfig } from '../../utils/gates'
import { isGateInGroup } from '../../types/gateGroups'
import { GridCell } from './GridCell'
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
}: OnCourseGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const focusedCellRef = useRef<HTMLTableCellElement>(null)

  // Filter competitors by selected race
  const filteredCompetitors = selectedRaceId
    ? competitors.filter((c) => c.raceId === selectedRaceId)
    : competitors

  // Sort by position (1 = closest to finish)
  const sortedCompetitors = [...filteredCompetitors].sort(
    (a, b) => a.position - b.position
  )

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

  // Combined keyboard handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // First try input handling (numbers, enter, escape)
      if (handleInputKeyDown(event)) return

      // Then try navigation (arrows, home, end, etc)
      handleNavKeyDown(event)
    },
    [handleInputKeyDown, handleNavKeyDown]
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

            return (
              <tr
                key={competitor.bib}
                className={`competitor-row ${competitor.completed ? 'completed' : 'on-course'} ${isChecked?.(competitor.bib) ? 'row-checked' : ''}`}
                role="row"
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
                    disabled={!competitor.completed}
                    title={competitor.completed ? 'Toggle checked' : 'Can only check finished competitors'}
                  >
                    {isChecked?.(competitor.bib) ? '✓' : ''}
                  </button>
                </td>
                <td className="col-pos" role="gridcell">{competitor.position}</td>
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
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
