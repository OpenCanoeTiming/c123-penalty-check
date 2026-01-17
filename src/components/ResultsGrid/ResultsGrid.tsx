import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
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
import type { GateGroup } from '../../types/ui'
import type { RemoveReason, ChannelPosition } from '../../types/scoring'
import {
  useFocusNavigation,
  useKeyboardInput,
  type PenaltyValue,
} from '../../hooks'
import { parseResultsGatesWithConfig } from '../../utils/gates'
import { isGateInGroup } from '../../types/gateGroups'
import { PenaltyCell } from './PenaltyCell'
import { CompetitorActions } from '../CompetitorActions'
import './ResultsGrid.css'

export interface ResultsGridProps {
  rows: C123ResultRow[]
  raceConfig: C123RaceConfigData | null
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
  /** Callback when remove from course action is triggered */
  onRemoveFromCourse?: (bib: string, reason: RemoveReason) => void
  /** Callback when manual timing action is triggered */
  onTiming?: (bib: string, position: ChannelPosition) => void
  /** Whether C123 is connected (enables/disables actions) */
  isC123Connected?: boolean
}

export function ResultsGrid({
  rows,
  raceConfig,
  activeGateGroup = null,
  allGateGroups = [],
  onPenaltySubmit,
  isChecked,
  onToggleChecked,
  onRemoveFromCourse,
  onTiming,
  isC123Connected = true,
}: ResultsGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const focusedCellRef = useRef<HTMLTableCellElement>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    bib: string
    name: string
    status?: string
    position: { x: number; y: number }
  } | null>(null)

  // Sort rows: valid results by rank, then DNS/DNF/DSQ at bottom by startOrder
  const sortedRows = useMemo(() => {
    const validRows = rows.filter((r) => !r.status).sort((a, b) => a.rank - b.rank)
    const invalidRows = rows.filter((r) => r.status).sort((a, b) => a.startOrder - b.startOrder)
    return [...validRows, ...invalidRows]
  }, [rows])

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
  const { pendingValue, handleKeyDown: handleInputKeyDown } = useKeyboardInput({
    enabled: sortedRows.length > 0 && nrGates > 0,
    onPenaltyInput: (value) => {
      if (!currentRow || !onPenaltySubmit) return
      onPenaltySubmit(currentRow.bib, currentGate, value)
    },
    onClear: () => {
      if (!currentRow || !onPenaltySubmit) return
      onPenaltySubmit(currentRow.bib, currentGate, 0)
    },
  })

  // Handle context menu open
  const handleContextMenu = useCallback(
    (event: React.MouseEvent, row: C123ResultRow) => {
      event.preventDefault()
      setContextMenu({
        bib: row.bib,
        name: row.name,
        status: row.status,
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
      if (contextMenu) {
        setContextMenu(null)
      }

      if (handleInputKeyDown(event)) return
      handleNavKeyDown(event)
    },
    [handleInputKeyDown, handleNavKeyDown, contextMenu]
  )

  // Focus the grid when position changes
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

  // Map status to badge variant
  const getStatusVariant = (status: string): 'error' | 'warning' | 'neutral' => {
    if (status === 'DSQ') return 'error'
    if (status === 'DNF') return 'warning'
    return 'neutral'
  }

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
    >
      <Table striped hover>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="col-check">
              <span className="visually-hidden">Checked</span>
              ✓
            </TableHeaderCell>
            <TableHeaderCell numeric className="col-pos">
              #
            </TableHeaderCell>
            <TableHeaderCell numeric className="col-bib">
              Bib
            </TableHeaderCell>
            <TableHeaderCell className="col-name">Name</TableHeaderCell>
            <TableHeaderCell numeric className="col-time">
              Time
            </TableHeaderCell>
            <TableHeaderCell numeric className="col-pen">
              Pen
            </TableHeaderCell>
            {visibleGateIndices.map((gateIndex) => {
              const gateNum = gateIndex + 1
              const gateType = gateConfig[gateIndex] ?? 'N'
              return (
                <TableHeaderCell
                  key={gateNum}
                  numeric
                  className={gateType === 'R' ? 'gate-header--reverse' : undefined}
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
            const checked = isChecked?.(row.bib) ?? false

            const rowClassNames = [
              checked && 'results-row--checked',
              hasStatus && 'results-row--status',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <TableRow
                key={row.bib}
                className={rowClassNames || undefined}
                onContextMenu={(e) => handleContextMenu(e, row)}
              >
                <TableCell className="col-check">
                  <button
                    type="button"
                    className={`check-btn ${checked ? 'check-btn--checked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleChecked?.(row.bib)
                    }}
                    aria-label={checked ? 'Uncheck' : 'Check'}
                    aria-pressed={checked}
                    disabled={hasStatus}
                    title={hasStatus ? `Cannot check ${row.status}` : 'Toggle checked'}
                  >
                    {checked ? '✓' : ''}
                  </button>
                </TableCell>
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
                <TableCell className="col-name">
                  <span className="name">{row.name}</span>
                  <span className="club">{row.club}</span>
                </TableCell>
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

                  return (
                    <PenaltyCell
                      key={gateNum}
                      ref={cellIsFocused ? focusedCellRef : undefined}
                      gate={gateNum}
                      value={hasStatus ? null : ((penalty?.value as PenaltyValue | null) ?? null)}
                      pendingValue={cellIsFocused ? pendingValue : null}
                      gateType={(penalty?.type ?? gateConfig[gateIndex] ?? 'N') as 'N' | 'R'}
                      isFocused={cellIsFocused}
                      isGroupBoundary={isBoundary}
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

      {/* Context menu for competitor actions */}
      {contextMenu && (
        <CompetitorActions
          bib={contextMenu.bib}
          name={contextMenu.name}
          isOnCourse={false}
          isFinished={!contextMenu.status}
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
