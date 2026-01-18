import { useState, useCallback, useMemo } from 'react'

/**
 * Position in the grid (row = competitor index, column = gate index)
 */
export interface FocusPosition {
  row: number
  column: number
}

export interface FocusNavigationOptions {
  /** Total number of rows (competitors) */
  rowCount: number
  /** Total number of columns (gates) */
  columnCount: number
  /** Callback when position changes */
  onPositionChange?: (position: FocusPosition) => void
  /** Wrap around at edges */
  wrapAround?: boolean
}


export interface FocusNavigationResult {
  /** Current focus position */
  position: FocusPosition
  /** Set position directly */
  setPosition: (position: FocusPosition) => void
  /** Move focus in a direction */
  move: (direction: 'up' | 'down' | 'left' | 'right') => void
  /** Move to start of row */
  moveToRowStart: () => void
  /** Move to end of row */
  moveToRowEnd: () => void
  /** Move to first row */
  moveToFirstRow: () => void
  /** Move to last row */
  moveToLastRow: () => void
  /** Move up by page (10 rows) */
  pageUp: () => void
  /** Move down by page (10 rows) */
  pageDown: () => void
  /** Handle keyboard event - returns true if handled */
  handleKeyDown: (event: KeyboardEvent | React.KeyboardEvent) => boolean
  /** Check if a cell is focused */
  isFocused: (row: number, column: number) => boolean
  /** Get cell ID for aria-activedescendant */
  getCellId: (row: number, column: number) => string
  /** Get ID of currently focused cell */
  activeCellId: string | null
}

const PAGE_SIZE = 10

/**
 * Hook for keyboard navigation in a grid
 *
 * Supports:
 * - Arrow keys for single-cell movement
 * - Home/End for row start/end
 * - Ctrl+Home/End for first/last row
 * - PageUp/PageDown for page movement
 * - Tab/Shift+Tab for linear navigation
 */
export function useFocusNavigation(
  options: FocusNavigationOptions
): FocusNavigationResult {
  const { rowCount, columnCount, onPositionChange, wrapAround = false } = options

  const [position, setPositionInternal] = useState<FocusPosition>({
    row: 0,
    column: 0,
  })

  // Clamp position to valid bounds
  const clampPosition = useCallback(
    (pos: FocusPosition): FocusPosition => {
      return {
        row: Math.max(0, Math.min(pos.row, rowCount - 1)),
        column: Math.max(0, Math.min(pos.column, columnCount - 1)),
      }
    },
    [rowCount, columnCount]
  )

  // Set position with bounds checking
  const setPosition = useCallback(
    (newPosition: FocusPosition) => {
      const clamped = clampPosition(newPosition)
      setPositionInternal(clamped)
      onPositionChange?.(clamped)
    },
    [clampPosition, onPositionChange]
  )

  // Internal move function (no throttling)
  const moveInternal = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      setPositionInternal((current) => {
        let newRow = current.row
        let newColumn = current.column

        switch (direction) {
          case 'up':
            newRow = current.row - 1
            if (newRow < 0) {
              newRow = wrapAround ? rowCount - 1 : 0
            }
            break
          case 'down':
            newRow = current.row + 1
            if (newRow >= rowCount) {
              newRow = wrapAround ? 0 : rowCount - 1
            }
            break
          case 'left':
            newColumn = current.column - 1
            if (newColumn < 0) {
              if (wrapAround && current.row > 0) {
                newColumn = columnCount - 1
                newRow = current.row - 1
              } else {
                newColumn = 0
              }
            }
            break
          case 'right':
            newColumn = current.column + 1
            if (newColumn >= columnCount) {
              if (wrapAround && current.row < rowCount - 1) {
                newColumn = 0
                newRow = current.row + 1
              } else {
                newColumn = columnCount - 1
              }
            }
            break
        }

        const newPosition = { row: newRow, column: newColumn }
        onPositionChange?.(newPosition)
        return newPosition
      })
    },
    [rowCount, columnCount, wrapAround, onPositionChange]
  )

  // Move function - direct execution, browser handles key repeat rate
  const move = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      moveInternal(direction)
    },
    [moveInternal]
  )

  // Navigation helpers
  const moveToRowStart = useCallback(() => {
    setPosition({ row: position.row, column: 0 })
  }, [position.row, setPosition])

  const moveToRowEnd = useCallback(() => {
    setPosition({ row: position.row, column: columnCount - 1 })
  }, [position.row, columnCount, setPosition])

  const moveToFirstRow = useCallback(() => {
    setPosition({ row: 0, column: position.column })
  }, [position.column, setPosition])

  const moveToLastRow = useCallback(() => {
    setPosition({ row: rowCount - 1, column: position.column })
  }, [rowCount, position.column, setPosition])

  const pageUp = useCallback(() => {
    setPosition({
      row: Math.max(0, position.row - PAGE_SIZE),
      column: position.column,
    })
  }, [position, setPosition])

  const pageDown = useCallback(() => {
    setPosition({
      row: Math.min(rowCount - 1, position.row + PAGE_SIZE),
      column: position.column,
    })
  }, [position, rowCount, setPosition])

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent | React.KeyboardEvent): boolean => {
      // Skip if no data
      if (rowCount === 0 || columnCount === 0) {
        return false
      }

      const key = event.key
      const ctrlKey = event.ctrlKey || event.metaKey

      switch (key) {
        case 'ArrowUp':
          event.preventDefault()
          move('up')
          return true

        case 'ArrowDown':
          event.preventDefault()
          move('down')
          return true

        case 'ArrowLeft':
          event.preventDefault()
          move('left')
          return true

        case 'ArrowRight':
          event.preventDefault()
          move('right')
          return true

        case 'Home':
          event.preventDefault()
          if (ctrlKey) {
            moveToFirstRow()
          } else {
            moveToRowStart()
          }
          return true

        case 'End':
          event.preventDefault()
          if (ctrlKey) {
            moveToLastRow()
          } else {
            moveToRowEnd()
          }
          return true

        case 'PageUp':
          event.preventDefault()
          pageUp()
          return true

        case 'PageDown':
          event.preventDefault()
          pageDown()
          return true

        case 'Tab':
          event.preventDefault()
          if (event.shiftKey) {
            move('left')
          } else {
            move('right')
          }
          return true

        default:
          return false
      }
    },
    [
      rowCount,
      columnCount,
      move,
      moveToRowStart,
      moveToRowEnd,
      moveToFirstRow,
      moveToLastRow,
      pageUp,
      pageDown,
    ]
  )

  // Check if a cell is focused
  const isFocused = useCallback(
    (row: number, column: number): boolean => {
      return position.row === row && position.column === column
    },
    [position]
  )

  // Generate cell ID for accessibility
  const getCellId = useCallback(
    (row: number, column: number): string => {
      return `grid-cell-${row}-${column}`
    },
    []
  )

  // Get current active cell ID
  const activeCellId = useMemo(() => {
    if (rowCount === 0 || columnCount === 0) {
      return null
    }
    return getCellId(position.row, position.column)
  }, [position, rowCount, columnCount, getCellId])

  return {
    position,
    setPosition,
    move,
    moveToRowStart,
    moveToRowEnd,
    moveToFirstRow,
    moveToLastRow,
    pageUp,
    pageDown,
    handleKeyDown,
    isFocused,
    getCellId,
    activeCellId,
  }
}
