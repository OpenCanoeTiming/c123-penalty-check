import { useRef, useEffect, useCallback, useMemo, type CSSProperties } from 'react'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Badge,
} from '@opencanoetiming/timing-design-system/react'
import type { C123ResultRow, C123RaceConfigData } from '../../types/c123server'
import type { GateGroup, ResultsSortOption } from '../../types/ui'
import type { PenaltyValue } from '../../types/scoring'
import {
  useFocusNavigation,
  useKeyboardInput,
} from '../../hooks'
import { parseResultsGatesWithConfig } from '../../utils/gates'
import { isGateInGroup } from '../../types/gateGroups'
import { PenaltyCell } from './PenaltyCell'
import { GateGroupIndicatorRow } from './GateGroupIndicatorRow'
import './ResultsGrid.css'

export interface ResultsGridProps {
  rows: C123ResultRow[]
  raceConfig: C123RaceConfigData | null
  /** Race ID for penalty corrections (required for finished competitors) */
  raceId?: string | null
  /** Active gate group for filtering (null = all gates) */
  activeGateGroup?: GateGroup | null
  /** All available gate groups for detecting group boundaries */
  allGateGroups?: GateGroup[]
  /** Sort order for competitors */
  sortBy?: ResultsSortOption
  /** Show start time column */
  showStartTime?: boolean
  /** Callback when a gate group is selected */
  onGroupSelect?: (groupId: string | null) => void
  /** Callback when a penalty is submitted */
  onPenaltySubmit?: (bib: string, gate: number, value: PenaltyValue, raceId?: string) => void
}

export function ResultsGrid({
  rows,
  raceConfig,
  raceId,
  activeGateGroup = null,
  allGateGroups = [],
  sortBy = 'rank',
  showStartTime = false,
  onGroupSelect,
  onPenaltySubmit,
}: ResultsGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const focusedCellRef = useRef<HTMLTableCellElement>(null)

  // Sort rows based on sortBy option
  // DNS/DNF/DSQ always go to bottom
  const sortedRows = useMemo(() => {
    const validRows = rows.filter((r) => !r.status)
    const invalidRows = rows.filter((r) => r.status)

    // Sort valid rows based on sortBy
    const sortedValid = [...validRows].sort((a, b) => {
      switch (sortBy) {
        case 'startOrder':
          return a.startOrder - b.startOrder
        case 'bib':
          return parseInt(a.bib, 10) - parseInt(b.bib, 10)
        case 'rank':
        default:
          return a.rank - b.rank
      }
    })

    // Invalid rows always sorted by startOrder
    const sortedInvalid = [...invalidRows].sort((a, b) => a.startOrder - b.startOrder)

    return [...sortedValid, ...sortedInvalid]
  }, [rows, sortBy])

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
    return visibleGateIndices.map((i) => i + 1)
  }, [visibleGateIndices])

  // Detect group boundaries for visual separators
  const groupBoundaries = useMemo(() => {
    const boundaries = new Set<number>()
    const customGroups = allGateGroups.filter((g) => g.gates.length > 0)

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
    rowCount: sortedRows.length,
    columnCount: visibleGateIndices.length,
  })

  // Get current competitor and gate info for keyboard input
  const currentRow = sortedRows[position.row]
  const currentGate = visibleColumnToGate[position.column] ?? 1

  // Keyboard input for penalty values
  const { pendingValue, clearPendingValue, handleKeyDown: handleInputKeyDown } = useKeyboardInput({
    enabled: sortedRows.length > 0 && nrGates > 0,
    onPenaltyInput: (value) => {
      if (!currentRow || !onPenaltySubmit) return
      onPenaltySubmit(currentRow.bib, currentGate, value, raceId ?? undefined)
    },
    onClear: () => {
      if (!currentRow || !onPenaltySubmit) return
      // Delete key sends null to delete the penalty
      onPenaltySubmit(currentRow.bib, currentGate, null, raceId ?? undefined)
    },
  })

  // Clear pending value when position changes
  useEffect(() => {
    clearPendingValue()
  }, [position.row, position.column, clearPendingValue])

  // Combined keyboard handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Prevent Space from scrolling
      if (event.key === ' ') {
        event.preventDefault()
        return
      }

      if (handleInputKeyDown(event)) return
      handleNavKeyDown(event)
    },
    [handleInputKeyDown, handleNavKeyDown]
  )

  // Focus the grid when position changes
  useEffect(() => {
    if (focusedCellRef.current) {
      focusedCellRef.current.focus()
    }
  }, [position])

  // Auto-focus grid when data loads (so arrow keys work immediately)
  useEffect(() => {
    if (sortedRows.length > 0 && gridRef.current) {
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        gridRef.current?.focus()
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [sortedRows.length > 0]) // Only trigger when data first appears

  // Handle cell click
  const handleCellClick = useCallback(
    (rowIndex: number, columnIndex: number) => {
      setPosition({ row: rowIndex, column: columnIndex })
      gridRef.current?.focus()
    },
    [setPosition]
  )

  // Map status to badge variant
  const getStatusVariant = (status: string): 'error' | 'warning' | 'neutral' => {
    if (status === 'DSQ') return 'error'
    if (status === 'DNF') return 'warning'
    return 'neutral'
  }

  // Calculate focused column for CSS highlighting
  const focusedColumn = position.column

  // CSS custom properties for column highlighting
  const gridStyle: CSSProperties = {
    '--focus-column': focusedColumn,
    '--focus-row': position.row,
  } as CSSProperties

  if (sortedRows.length === 0) {
    return (
      <div className="results-grid results-grid--empty">
        <p>No results available</p>
      </div>
    )
  }

  return (
    <div
      ref={gridRef}
      className="results-grid"
      role="grid"
      aria-label="Results grid"
      aria-activedescendant={activeCellId ?? undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={gridStyle}
    >
      <Table striped hover>
        <TableHead>
          {/* Gate group indicator row */}
          {onGroupSelect && (
            <GateGroupIndicatorRow
              groups={allGateGroups}
              totalGates={nrGates}
              activeGroupId={activeGateGroup?.id ?? null}
              onGroupClick={onGroupSelect}
              fixedColumnsCount={showStartTime ? 6 : 5}
              visibleGateIndices={visibleGateIndices}
            />
          )}
          <TableRow>
            <TableHeaderCell numeric className="col-pos">
              #
            </TableHeaderCell>
            <TableHeaderCell numeric className="col-bib">
              Bib
            </TableHeaderCell>
            <TableHeaderCell className="col-name">Name</TableHeaderCell>
            {showStartTime && (
              <TableHeaderCell numeric className="col-start-time">
                Start
              </TableHeaderCell>
            )}
            <TableHeaderCell numeric className="col-time">
              Time
            </TableHeaderCell>
            <TableHeaderCell numeric className="col-pen">
              Pen
            </TableHeaderCell>
            {visibleGateIndices.map((gateIndex, visibleColIndex) => {
              const gateNum = gateIndex + 1
              const gateType = gateConfig[gateIndex] ?? 'N'
              const isFocusedCol = focusedColumn === visibleColIndex
              const hasActiveGroup = !!(activeGateGroup && activeGateGroup.gates.length > 0)
              const isInActiveGroup = hasActiveGroup && activeGateGroup!.gates.includes(gateNum)
              const isDimmed = hasActiveGroup && !isInActiveGroup
              const headerClasses = [
                gateType === 'R' && 'gate-header--reverse',
                isFocusedCol && 'gate-header--focus',
                isInActiveGroup && 'gate-header--in-group',
                isDimmed && 'gate-header--dimmed',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <TableHeaderCell
                  key={gateNum}
                  numeric
                  className={headerClasses || undefined}
                >
                  {gateNum}
                </TableHeaderCell>
              )
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map((row, rowIndex) => {
            const penalties = parseResultsGatesWithConfig(row.gates, gateConfig)
            const hasStatus = !!row.status

            const isRowFocused = position.row === rowIndex
            const rowClassNames = [
              hasStatus && 'results-row--status',
              isRowFocused && 'results-row--focus',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <TableRow
                key={row.bib}
                className={rowClassNames || undefined}
              >
                <TableCell numeric className="col-pos">
                  {hasStatus ? (
                    <Badge variant={getStatusVariant(row.status!)}>{row.status}</Badge>
                  ) : (
                    row.rank
                  )}
                </TableCell>
                <TableCell numeric className="col-bib">
                  {row.bib}
                </TableCell>
                <TableCell className="col-name">{row.name}</TableCell>
                {showStartTime && (
                  <TableCell numeric className="col-start-time">
                    {row.startTime || '-'}
                  </TableCell>
                )}
                <TableCell numeric className="col-time">
                  {hasStatus ? '-' : `${row.time}s`}
                </TableCell>
                <TableCell numeric className="col-pen">
                  {!hasStatus && row.pen > 0 ? `+${row.pen}` : ''}
                </TableCell>
                {visibleGateIndices.map((gateIndex, visibleColIndex) => {
                  const gateNum = gateIndex + 1
                  const penalty = penalties.find((p) => p.gate === gateNum)
                  const cellIsFocused = isFocused(rowIndex, visibleColIndex)
                  const isBoundary = groupBoundaries.has(gateNum)
                  const isColFocused = focusedColumn === visibleColIndex
                  const hasActiveGroup = !!(activeGateGroup && activeGateGroup.gates.length > 0)
                  const isInActiveGroup = hasActiveGroup && activeGateGroup!.gates.includes(gateNum)
                  const isDimmed = hasActiveGroup && !isInActiveGroup

                  return (
                    <PenaltyCell
                      key={gateNum}
                      ref={cellIsFocused ? focusedCellRef : undefined}
                      gate={gateNum}
                      value={hasStatus ? null : ((penalty?.value as PenaltyValue | null) ?? null)}
                      pendingValue={cellIsFocused ? pendingValue : null}
                      gateType={(penalty?.type ?? gateConfig[gateIndex] ?? 'N') as 'N' | 'R'}
                      isFocused={cellIsFocused}
                      isColumnFocused={isColFocused}
                      isGroupBoundary={isBoundary}
                      isInActiveGroup={!!isInActiveGroup}
                      isDimmed={isDimmed}
                      id={getCellId(rowIndex, visibleColIndex)}
                      onClick={() => handleCellClick(rowIndex, visibleColIndex)}
                    />
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
