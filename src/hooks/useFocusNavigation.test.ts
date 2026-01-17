import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFocusNavigation } from './useFocusNavigation'

// =============================================================================
// Test Helpers
// =============================================================================

const createKeyboardEvent = (
  key: string,
  options: { ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean } = {}
): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: options.ctrlKey || false,
    shiftKey: options.shiftKey || false,
    metaKey: options.metaKey || false,
    bubbles: true,
    cancelable: true,
  })
  // Mock preventDefault since jsdom doesn't implement it properly
  event.preventDefault = vi.fn()
  return event
}

// =============================================================================
// Tests
// =============================================================================

describe('useFocusNavigation', () => {
  const defaultOptions = {
    rowCount: 5,
    columnCount: 10,
  }

  describe('initial state', () => {
    it('starts at position (0, 0)', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      expect(result.current.position).toEqual({ row: 0, column: 0 })
    })

    it('returns correct activeCellId', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      expect(result.current.activeCellId).toBe('grid-cell-0-0')
    })

    it('returns null activeCellId when grid is empty', () => {
      const { result } = renderHook(() =>
        useFocusNavigation({ rowCount: 0, columnCount: 0 })
      )

      expect(result.current.activeCellId).toBeNull()
    })
  })

  describe('setPosition', () => {
    it('sets position directly', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 2, column: 5 })
      })

      expect(result.current.position).toEqual({ row: 2, column: 5 })
    })

    it('clamps position to valid bounds', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 100, column: 100 })
      })

      expect(result.current.position).toEqual({ row: 4, column: 9 }) // max row=4, max col=9
    })

    it('clamps negative position to 0', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: -5, column: -10 })
      })

      expect(result.current.position).toEqual({ row: 0, column: 0 })
    })

    it('calls onPositionChange callback', () => {
      const onPositionChange = vi.fn()
      const { result } = renderHook(() =>
        useFocusNavigation({ ...defaultOptions, onPositionChange })
      )

      act(() => {
        result.current.setPosition({ row: 2, column: 3 })
      })

      expect(onPositionChange).toHaveBeenCalledWith({ row: 2, column: 3 })
    })
  })

  describe('move', () => {
    describe('without wrapAround', () => {
      it('moves down', () => {
        const { result } = renderHook(() => useFocusNavigation(defaultOptions))

        act(() => {
          result.current.move('down')
        })

        expect(result.current.position).toEqual({ row: 1, column: 0 })
      })

      it('moves up', () => {
        const { result } = renderHook(() => useFocusNavigation(defaultOptions))

        act(() => {
          result.current.setPosition({ row: 2, column: 0 })
        })
        act(() => {
          result.current.move('up')
        })

        expect(result.current.position).toEqual({ row: 1, column: 0 })
      })

      it('moves right', () => {
        const { result } = renderHook(() => useFocusNavigation(defaultOptions))

        act(() => {
          result.current.move('right')
        })

        expect(result.current.position).toEqual({ row: 0, column: 1 })
      })

      it('moves left', () => {
        const { result } = renderHook(() => useFocusNavigation(defaultOptions))

        act(() => {
          result.current.setPosition({ row: 0, column: 5 })
        })
        act(() => {
          result.current.move('left')
        })

        expect(result.current.position).toEqual({ row: 0, column: 4 })
      })

      it('stops at top boundary', () => {
        const { result } = renderHook(() => useFocusNavigation(defaultOptions))

        act(() => {
          result.current.move('up')
        })

        expect(result.current.position).toEqual({ row: 0, column: 0 })
      })

      it('stops at bottom boundary', () => {
        const { result } = renderHook(() => useFocusNavigation(defaultOptions))

        act(() => {
          result.current.setPosition({ row: 4, column: 0 })
        })
        act(() => {
          result.current.move('down')
        })

        expect(result.current.position).toEqual({ row: 4, column: 0 })
      })

      it('stops at left boundary', () => {
        const { result } = renderHook(() => useFocusNavigation(defaultOptions))

        act(() => {
          result.current.move('left')
        })

        expect(result.current.position).toEqual({ row: 0, column: 0 })
      })

      it('stops at right boundary', () => {
        const { result } = renderHook(() => useFocusNavigation(defaultOptions))

        act(() => {
          result.current.setPosition({ row: 0, column: 9 })
        })
        act(() => {
          result.current.move('right')
        })

        expect(result.current.position).toEqual({ row: 0, column: 9 })
      })
    })

    describe('with wrapAround', () => {
      const wrapOptions = { ...defaultOptions, wrapAround: true }

      it('wraps from top to bottom', () => {
        const { result } = renderHook(() => useFocusNavigation(wrapOptions))

        act(() => {
          result.current.move('up')
        })

        expect(result.current.position).toEqual({ row: 4, column: 0 })
      })

      it('wraps from bottom to top', () => {
        const { result } = renderHook(() => useFocusNavigation(wrapOptions))

        act(() => {
          result.current.setPosition({ row: 4, column: 0 })
        })
        act(() => {
          result.current.move('down')
        })

        expect(result.current.position).toEqual({ row: 0, column: 0 })
      })

      it('wraps from left to previous row end', () => {
        const { result } = renderHook(() => useFocusNavigation(wrapOptions))

        act(() => {
          result.current.setPosition({ row: 2, column: 0 })
        })
        act(() => {
          result.current.move('left')
        })

        expect(result.current.position).toEqual({ row: 1, column: 9 })
      })

      it('stays at position when at first row and moving left', () => {
        const { result } = renderHook(() => useFocusNavigation(wrapOptions))

        act(() => {
          result.current.move('left')
        })

        expect(result.current.position).toEqual({ row: 0, column: 0 })
      })

      it('wraps from right to next row start', () => {
        const { result } = renderHook(() => useFocusNavigation(wrapOptions))

        act(() => {
          result.current.setPosition({ row: 2, column: 9 })
        })
        act(() => {
          result.current.move('right')
        })

        expect(result.current.position).toEqual({ row: 3, column: 0 })
      })

      it('stays at position when at last row and moving right', () => {
        const { result } = renderHook(() => useFocusNavigation(wrapOptions))

        act(() => {
          result.current.setPosition({ row: 4, column: 9 })
        })
        act(() => {
          result.current.move('right')
        })

        expect(result.current.position).toEqual({ row: 4, column: 9 })
      })
    })
  })

  describe('navigation helpers', () => {
    it('moveToRowStart moves to column 0', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 2, column: 5 })
      })
      act(() => {
        result.current.moveToRowStart()
      })

      expect(result.current.position).toEqual({ row: 2, column: 0 })
    })

    it('moveToRowEnd moves to last column', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 2, column: 0 })
      })
      act(() => {
        result.current.moveToRowEnd()
      })

      expect(result.current.position).toEqual({ row: 2, column: 9 })
    })

    it('moveToFirstRow moves to row 0', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 3, column: 5 })
      })
      act(() => {
        result.current.moveToFirstRow()
      })

      expect(result.current.position).toEqual({ row: 0, column: 5 })
    })

    it('moveToLastRow moves to last row', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 0, column: 5 })
      })
      act(() => {
        result.current.moveToLastRow()
      })

      expect(result.current.position).toEqual({ row: 4, column: 5 })
    })

    it('pageUp moves up by 10 rows', () => {
      const largeGrid = { rowCount: 25, columnCount: 10 }
      const { result } = renderHook(() => useFocusNavigation(largeGrid))

      act(() => {
        result.current.setPosition({ row: 15, column: 5 })
      })
      act(() => {
        result.current.pageUp()
      })

      expect(result.current.position).toEqual({ row: 5, column: 5 })
    })

    it('pageUp clamps to row 0', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 3, column: 5 })
      })
      act(() => {
        result.current.pageUp()
      })

      expect(result.current.position).toEqual({ row: 0, column: 5 })
    })

    it('pageDown moves down by 10 rows', () => {
      const largeGrid = { rowCount: 25, columnCount: 10 }
      const { result } = renderHook(() => useFocusNavigation(largeGrid))

      act(() => {
        result.current.setPosition({ row: 5, column: 5 })
      })
      act(() => {
        result.current.pageDown()
      })

      expect(result.current.position).toEqual({ row: 15, column: 5 })
    })

    it('pageDown clamps to last row', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 2, column: 5 })
      })
      act(() => {
        result.current.pageDown()
      })

      expect(result.current.position).toEqual({ row: 4, column: 5 })
    })
  })

  describe('handleKeyDown', () => {
    it('handles ArrowUp', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 2, column: 0 })
      })

      const event = createKeyboardEvent('ArrowUp')
      act(() => {
        const handled = result.current.handleKeyDown(event)
        expect(handled).toBe(true)
      })

      expect(result.current.position).toEqual({ row: 1, column: 0 })
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('handles ArrowDown', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      const event = createKeyboardEvent('ArrowDown')
      act(() => {
        const handled = result.current.handleKeyDown(event)
        expect(handled).toBe(true)
      })

      expect(result.current.position).toEqual({ row: 1, column: 0 })
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('handles ArrowLeft', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 0, column: 5 })
      })

      const event = createKeyboardEvent('ArrowLeft')
      act(() => {
        const handled = result.current.handleKeyDown(event)
        expect(handled).toBe(true)
      })

      expect(result.current.position).toEqual({ row: 0, column: 4 })
    })

    it('handles ArrowRight', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      const event = createKeyboardEvent('ArrowRight')
      act(() => {
        const handled = result.current.handleKeyDown(event)
        expect(handled).toBe(true)
      })

      expect(result.current.position).toEqual({ row: 0, column: 1 })
    })

    it('handles Home', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 2, column: 5 })
      })

      const event = createKeyboardEvent('Home')
      act(() => {
        const handled = result.current.handleKeyDown(event)
        expect(handled).toBe(true)
      })

      expect(result.current.position).toEqual({ row: 2, column: 0 })
    })

    it('handles End', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 2, column: 5 })
      })

      const event = createKeyboardEvent('End')
      act(() => {
        const handled = result.current.handleKeyDown(event)
        expect(handled).toBe(true)
      })

      expect(result.current.position).toEqual({ row: 2, column: 9 })
    })

    it('handles Ctrl+Home', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 3, column: 5 })
      })

      const event = createKeyboardEvent('Home', { ctrlKey: true })
      act(() => {
        const handled = result.current.handleKeyDown(event)
        expect(handled).toBe(true)
      })

      expect(result.current.position).toEqual({ row: 0, column: 5 })
    })

    it('handles Ctrl+End', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 1, column: 5 })
      })

      const event = createKeyboardEvent('End', { ctrlKey: true })
      act(() => {
        const handled = result.current.handleKeyDown(event)
        expect(handled).toBe(true)
      })

      expect(result.current.position).toEqual({ row: 4, column: 5 })
    })

    it('handles Meta+Home (Mac)', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 3, column: 5 })
      })

      const event = createKeyboardEvent('Home', { metaKey: true })
      act(() => {
        result.current.handleKeyDown(event)
      })

      expect(result.current.position).toEqual({ row: 0, column: 5 })
    })

    it('handles PageUp', () => {
      const largeGrid = { rowCount: 25, columnCount: 10 }
      const { result } = renderHook(() => useFocusNavigation(largeGrid))

      act(() => {
        result.current.setPosition({ row: 15, column: 5 })
      })

      const event = createKeyboardEvent('PageUp')
      act(() => {
        const handled = result.current.handleKeyDown(event)
        expect(handled).toBe(true)
      })

      expect(result.current.position).toEqual({ row: 5, column: 5 })
    })

    it('handles PageDown', () => {
      const largeGrid = { rowCount: 25, columnCount: 10 }
      const { result } = renderHook(() => useFocusNavigation(largeGrid))

      act(() => {
        result.current.setPosition({ row: 5, column: 5 })
      })

      const event = createKeyboardEvent('PageDown')
      act(() => {
        const handled = result.current.handleKeyDown(event)
        expect(handled).toBe(true)
      })

      expect(result.current.position).toEqual({ row: 15, column: 5 })
    })

    it('handles Tab (move right)', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      const event = createKeyboardEvent('Tab')
      act(() => {
        const handled = result.current.handleKeyDown(event)
        expect(handled).toBe(true)
      })

      expect(result.current.position).toEqual({ row: 0, column: 1 })
    })

    it('handles Shift+Tab (move left)', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 0, column: 5 })
      })

      const event = createKeyboardEvent('Tab', { shiftKey: true })
      act(() => {
        const handled = result.current.handleKeyDown(event)
        expect(handled).toBe(true)
      })

      expect(result.current.position).toEqual({ row: 0, column: 4 })
    })

    it('returns false for unhandled keys', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      const event = createKeyboardEvent('a')
      let handled: boolean = false
      act(() => {
        handled = result.current.handleKeyDown(event)
      })

      expect(handled).toBe(false)
      expect(result.current.position).toEqual({ row: 0, column: 0 })
    })

    it('returns false when grid is empty', () => {
      const { result } = renderHook(() =>
        useFocusNavigation({ rowCount: 0, columnCount: 0 })
      )

      const event = createKeyboardEvent('ArrowDown')
      let handled: boolean = false
      act(() => {
        handled = result.current.handleKeyDown(event)
      })

      expect(handled).toBe(false)
    })
  })

  describe('isFocused', () => {
    it('returns true for focused cell', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 2, column: 5 })
      })

      expect(result.current.isFocused(2, 5)).toBe(true)
    })

    it('returns false for non-focused cell', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      act(() => {
        result.current.setPosition({ row: 2, column: 5 })
      })

      expect(result.current.isFocused(0, 0)).toBe(false)
      expect(result.current.isFocused(2, 4)).toBe(false)
      expect(result.current.isFocused(3, 5)).toBe(false)
    })
  })

  describe('getCellId', () => {
    it('returns consistent cell ID format', () => {
      const { result } = renderHook(() => useFocusNavigation(defaultOptions))

      expect(result.current.getCellId(0, 0)).toBe('grid-cell-0-0')
      expect(result.current.getCellId(2, 5)).toBe('grid-cell-2-5')
      expect(result.current.getCellId(10, 20)).toBe('grid-cell-10-20')
    })
  })

  describe('onPositionChange callback', () => {
    it('is called on move', () => {
      const onPositionChange = vi.fn()
      const { result } = renderHook(() =>
        useFocusNavigation({ ...defaultOptions, onPositionChange })
      )

      act(() => {
        result.current.move('down')
      })

      expect(onPositionChange).toHaveBeenCalledWith({ row: 1, column: 0 })
    })

    it('is called on keyboard navigation', () => {
      const onPositionChange = vi.fn()
      const { result } = renderHook(() =>
        useFocusNavigation({ ...defaultOptions, onPositionChange })
      )

      const event = createKeyboardEvent('ArrowDown')
      act(() => {
        result.current.handleKeyDown(event)
      })

      expect(onPositionChange).toHaveBeenCalledWith({ row: 1, column: 0 })
    })
  })
})
