/**
 * PenaltyContextMenu - Context menu for quick penalty selection
 *
 * Appears on long press or right-click on a penalty cell.
 */

import { useEffect, useRef } from 'react'
import type { PenaltyValue } from '../../types/scoring'
import type { FlagEntry, GateCheckStatus } from '../../types/checks'
import styles from './PenaltyContextMenu.module.css'

export interface PenaltyContextMenuProps {
  /** X position (client coordinates) */
  x: number
  /** Y position (client coordinates) */
  y: number
  /** Current value in the cell */
  currentValue: PenaltyValue
  /** Callback when a value is selected */
  onSelect: (value: PenaltyValue) => void
  /** Callback to close the menu */
  onClose: () => void
  /** Verification state of this gate (flagged > stale > verified > plain) */
  checkStatus: GateCheckStatus
  /** Whether this gate has a value to verify against - false on an empty gate */
  canVerify: boolean
  /** The gate's open flag, or null if it has none. A resolved flag does not count. */
  openFlag: FlagEntry | null
  /** Toggle verification of this gate (Space) */
  onToggleCheck: () => void
  /** Verify the whole section this gate belongs to (Shift+Space) */
  onVerifySection: () => void
  /** Open the create-flag dialog for this gate */
  onAddFlag: () => void
  /** Open the resolve-flag dialog for this gate's open flag */
  onResolveFlag: (flag: FlagEntry) => void
}

interface MenuOption {
  value: PenaltyValue
  label: string
  shortcut: string
}

const MENU_OPTIONS: MenuOption[] = [
  { value: 0, label: 'Clear (0)', shortcut: '0' },
  { value: 2, label: 'Touch (2s)', shortcut: '2' },
  { value: 50, label: 'Missed (50s)', shortcut: '5' },
  { value: null, label: 'Delete', shortcut: 'Del' },
]

export function PenaltyContextMenu({
  x,
  y,
  currentValue,
  onSelect,
  onClose,
  checkStatus,
  canVerify,
  openFlag,
  onToggleCheck,
  onVerifySection,
  onAddFlag,
  onResolveFlag,
}: PenaltyContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    // Add listeners after a small delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }, 10)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (!menuRef.current) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Adjust if menu goes off right edge
    if (rect.right > viewportWidth) {
      menu.style.left = `${x - rect.width}px`
    }

    // Adjust if menu goes off bottom edge
    if (rect.bottom > viewportHeight) {
      menu.style.top = `${y - rect.height}px`
    }
  }, [x, y])

  const handleSelect = (value: PenaltyValue) => {
    onSelect(value)
    onClose()
  }

  // A check entry exists for this gate in either of these states - 'stale'
  // just means the live value has since drifted from what was checked - so
  // both mean "toggling un-verifies it", same as the keyboard route treats
  // Space on either status.
  const isVerified = checkStatus === 'verified' || checkStatus === 'stale'

  // Trust `resolved`, not just presence: `openFlag` is the caller's best
  // guess at the gate's open flag, and treating a resolved one as open here
  // would offer "Resolve flag..." on a gate that has nothing left to
  // resolve. Narrowed to a single value (rather than a boolean alongside
  // `openFlag`) so the JSX below can use it directly without an unsafe cast.
  const activeFlag = openFlag && !openFlag.resolved ? openFlag : null

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ left: x, top: y }}
      role="menu"
      aria-label="Penalty options"
    >
      {MENU_OPTIONS.map((option) => {
        const isActive = option.value === currentValue
        return (
          <button
            key={option.label}
            className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`}
            onClick={() => handleSelect(option.value)}
            role="menuitem"
          >
            <span className={styles.menuItemLabel}>{option.label}</span>
            <span className={styles.menuItemShortcut}>{option.shortcut}</span>
          </button>
        )
      })}

      <div className={styles.separator} role="separator" />

      <button
        className={styles.menuItem}
        onClick={() => {
          onToggleCheck()
          onClose()
        }}
        disabled={!canVerify && !isVerified}
        title={
          !canVerify && !isVerified ? 'Enter a penalty value first' : undefined
        }
        role="menuitem"
      >
        <span className={styles.menuItemLabel}>
          {isVerified ? 'Un-verify gate' : 'Verify gate'}
        </span>
        <span className={styles.menuItemShortcut}>Space</span>
      </button>

      <button
        className={styles.menuItem}
        onClick={() => {
          onVerifySection()
          onClose()
        }}
        role="menuitem"
      >
        <span className={styles.menuItemLabel}>Verify section</span>
        <span className={styles.menuItemShortcut}>⇧Space</span>
      </button>

      {activeFlag ? (
        <button
          className={styles.menuItem}
          onClick={() => {
            onResolveFlag(activeFlag)
            onClose()
          }}
          role="menuitem"
        >
          <span className={styles.menuItemLabel}>Resolve flag…</span>
        </button>
      ) : (
        <button
          className={styles.menuItem}
          onClick={() => {
            onAddFlag()
            onClose()
          }}
          role="menuitem"
        >
          <span className={styles.menuItemLabel}>Add flag…</span>
        </button>
      )}
    </div>
  )
}
