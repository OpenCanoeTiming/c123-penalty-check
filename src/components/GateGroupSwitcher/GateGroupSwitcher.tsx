/**
 * GateGroupSwitcher Component
 *
 * Quick-access buttons for switching between gate groups.
 * Allows judges to rapidly toggle their view of relevant gates.
 */

import { Button } from '@opencanoetiming/timing-design-system'
import type { GateGroup } from '../../types/ui'
import styles from './GateGroupSwitcher.module.css'

export interface GateGroupSwitcherProps {
  /** All available gate groups */
  groups: GateGroup[]
  /** Currently active group ID (null = all gates) */
  activeGroupId: string | null
  /** Callback when group is selected */
  onSelectGroup: (groupId: string | null) => void
  /** Optional callback to open the gate group editor */
  onOpenEditor?: () => void
  /** Total number of gates in race (for display) */
  totalGates?: number
}

/**
 * Displays a row of buttons for quick gate group switching.
 * Shows group color indicators and supports keyboard shortcuts (1-9).
 */
export function GateGroupSwitcher({
  groups,
  activeGroupId,
  onSelectGroup,
  onOpenEditor,
  totalGates,
}: GateGroupSwitcherProps) {
  // Filter to only show groups with gates (exclude "all" as it's the default)
  const customGroups = groups.filter((g) => g.gates.length > 0)

  // Get active group for display
  const activeGroup = activeGroupId ? groups.find((g) => g.id === activeGroupId) : null
  const activeGatesDisplay = activeGroup
    ? `${activeGroup.gates.length} gates`
    : totalGates
      ? `${totalGates} gates`
      : 'All gates'

  return (
    <div className={styles.switcher} role="toolbar" aria-label="Gate group switcher">
      {/* Label showing active group info */}
      <span className={styles.label}>
        Gates: <strong>{activeGroup?.name ?? 'All'}</strong>
        <span className={styles.gateCount}>({activeGatesDisplay})</span>
      </span>

      {/* Group buttons */}
      <div className={styles.buttons}>
        {/* All Gates button */}
        <button
          type="button"
          className={`${styles.groupButton} ${activeGroupId === null ? styles.active : ''}`}
          onClick={() => onSelectGroup(null)}
          title="Show all gates (key: 0)"
        >
          All
        </button>

      {/* Custom group buttons */}
      {customGroups.map((group, index) => {
        const shortcutKey = index + 1
        const isActive = activeGroupId === group.id

        return (
          <button
            key={group.id}
            type="button"
            className={`${styles.groupButton} ${isActive ? styles.active : ''}`}
            onClick={() => onSelectGroup(group.id)}
            title={`${group.name} (key: ${shortcutKey <= 9 ? shortcutKey : 'N/A'})`}
            style={
              group.color
                ? {
                    '--group-color': group.color,
                  } as React.CSSProperties
                : undefined
            }
          >
            {group.color && (
              <span
                className={styles.colorDot}
                style={{ backgroundColor: group.color }}
                aria-hidden="true"
              />
            )}
            <span className={styles.groupLabel}>{group.name}</span>
          </button>
        )
      })}

        {/* Edit groups button */}
        {onOpenEditor && (
          <Button
            variant="ghost"
            size="sm"
            icon
            onClick={onOpenEditor}
            title="Edit gate groups"
            aria-label="Edit gate groups"
            className={styles.editButton}
          >
            ✎
          </Button>
        )}
      </div>
    </div>
  )
}
