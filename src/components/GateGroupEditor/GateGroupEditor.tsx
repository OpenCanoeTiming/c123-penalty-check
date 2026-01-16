/**
 * GateGroupEditor Component
 *
 * Visual editor for creating and managing gate groups.
 * Allows judges to define subsets of gates they are responsible for.
 */

import { useState, useCallback } from 'react'
import type { GateGroup } from '../../types/ui'
import { GROUP_COLORS, validateGateGroup } from '../../types/gateGroups'
import styles from './GateGroupEditor.module.css'

export interface GateGroupEditorProps {
  /** Total number of gates in the race */
  totalGates: number
  /** Existing custom groups */
  groups: GateGroup[]
  /** Currently active group ID */
  activeGroupId: string | null
  /** Callback when a group is added */
  onAddGroup: (name: string, gates: number[], color?: string) => GateGroup
  /** Callback when a group is updated */
  onUpdateGroup: (groupId: string, updates: Partial<Omit<GateGroup, 'id'>>) => void
  /** Callback when a group is removed */
  onRemoveGroup: (groupId: string) => void
  /** Callback when active group changes */
  onSetActiveGroup: (groupId: string | null) => void
  /** Optional callback to close the editor */
  onClose?: () => void
}

interface EditingGroup {
  id: string | null // null = new group
  name: string
  gates: Set<number>
  color: string
}

function getNextColor(groups: GateGroup[]): string {
  const usedColors = new Set(groups.map((g) => g.color).filter(Boolean))
  return GROUP_COLORS.find((c) => !usedColors.has(c)) ?? GROUP_COLORS[0]
}

export function GateGroupEditor({
  totalGates,
  groups,
  activeGroupId,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  onSetActiveGroup,
  onClose,
}: GateGroupEditorProps) {
  const [editingGroup, setEditingGroup] = useState<EditingGroup | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startNewGroup = useCallback(() => {
    setEditingGroup({
      id: null,
      name: '',
      gates: new Set(),
      color: getNextColor(groups),
    })
    setError(null)
  }, [groups])

  const startEditGroup = useCallback((group: GateGroup) => {
    setEditingGroup({
      id: group.id,
      name: group.name,
      gates: new Set(group.gates),
      color: group.color ?? GROUP_COLORS[0],
    })
    setError(null)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingGroup(null)
    setError(null)
  }, [])

  const toggleGate = useCallback((gateNumber: number) => {
    setEditingGroup((prev) => {
      if (!prev) return prev
      const newGates = new Set(prev.gates)
      if (newGates.has(gateNumber)) {
        newGates.delete(gateNumber)
      } else {
        newGates.add(gateNumber)
      }
      return { ...prev, gates: newGates }
    })
  }, [])

  const selectGateRange = useCallback((start: number, end: number) => {
    setEditingGroup((prev) => {
      if (!prev) return prev
      const newGates = new Set(prev.gates)
      for (let i = start; i <= end; i++) {
        newGates.add(i)
      }
      return { ...prev, gates: newGates }
    })
  }, [])

  const clearGates = useCallback(() => {
    setEditingGroup((prev) => {
      if (!prev) return prev
      return { ...prev, gates: new Set() }
    })
  }, [])

  const saveGroup = useCallback(() => {
    if (!editingGroup) return

    const gatesArray = Array.from(editingGroup.gates).sort((a, b) => a - b)
    const groupToValidate: GateGroup = {
      id: editingGroup.id ?? 'temp',
      name: editingGroup.name,
      gates: gatesArray,
      color: editingGroup.color,
    }

    const validation = validateGateGroup(groupToValidate, totalGates)
    if (!validation.valid) {
      setError(validation.errors.join('. '))
      return
    }

    if (editingGroup.id) {
      // Update existing
      onUpdateGroup(editingGroup.id, {
        name: editingGroup.name,
        gates: gatesArray,
        color: editingGroup.color,
      })
    } else {
      // Create new
      onAddGroup(editingGroup.name, gatesArray, editingGroup.color)
    }

    setEditingGroup(null)
    setError(null)
  }, [editingGroup, totalGates, onAddGroup, onUpdateGroup])

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingGroup((prev) => (prev ? { ...prev, name: e.target.value } : prev))
  }, [])

  const handleColorChange = useCallback((color: string) => {
    setEditingGroup((prev) => (prev ? { ...prev, color } : prev))
  }, [])

  // Generate gate numbers array
  const gateNumbers = Array.from({ length: totalGates }, (_, i) => i + 1)

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <h3 className={styles.title}>Gate Groups</h3>
        {onClose && (
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>

      {/* Existing groups list */}
      <div className={styles.groupsList}>
        <GroupItem
          group={{ id: 'all', name: 'All Gates', gates: [] }}
          isActive={activeGroupId === null}
          onActivate={() => onSetActiveGroup(null)}
          onEdit={undefined}
          onRemove={undefined}
        />

        {groups.map((group) => (
          <GroupItem
            key={group.id}
            group={group}
            isActive={activeGroupId === group.id}
            onActivate={() => onSetActiveGroup(group.id)}
            onEdit={() => startEditGroup(group)}
            onRemove={() => onRemoveGroup(group.id)}
          />
        ))}
      </div>

      {/* Add new group button */}
      {!editingGroup && (
        <button className={styles.addButton} onClick={startNewGroup}>
          + Add Group
        </button>
      )}

      {/* Edit form */}
      {editingGroup && (
        <div className={styles.editForm}>
          <h4 className={styles.formTitle}>
            {editingGroup.id ? 'Edit Group' : 'New Group'}
          </h4>

          <div className={styles.formField}>
            <label htmlFor="group-name" className={styles.label}>
              Name
            </label>
            <input
              id="group-name"
              type="text"
              className={styles.input}
              value={editingGroup.name}
              onChange={handleNameChange}
              placeholder="e.g., Judge 1, Gates 1-6"
              autoFocus
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>Color</label>
            <div className={styles.colorPicker}>
              {GROUP_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`${styles.colorSwatch} ${editingGroup.color === color ? styles.colorSelected : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className={styles.formField}>
            <div className={styles.gatesHeader}>
              <label className={styles.label}>
                Gates ({editingGroup.gates.size} selected)
              </label>
              <div className={styles.gatesActions}>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={clearGates}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Quick range selectors */}
            {totalGates >= 6 && (
              <div className={styles.quickRanges}>
                <button
                  type="button"
                  className={styles.rangeButton}
                  onClick={() => selectGateRange(1, Math.ceil(totalGates / 2))}
                >
                  1-{Math.ceil(totalGates / 2)}
                </button>
                <button
                  type="button"
                  className={styles.rangeButton}
                  onClick={() => selectGateRange(Math.ceil(totalGates / 2) + 1, totalGates)}
                >
                  {Math.ceil(totalGates / 2) + 1}-{totalGates}
                </button>
                {totalGates >= 12 && (
                  <>
                    <button
                      type="button"
                      className={styles.rangeButton}
                      onClick={() => selectGateRange(1, Math.ceil(totalGates / 3))}
                    >
                      1-{Math.ceil(totalGates / 3)}
                    </button>
                    <button
                      type="button"
                      className={styles.rangeButton}
                      onClick={() =>
                        selectGateRange(
                          Math.ceil(totalGates / 3) + 1,
                          Math.ceil((2 * totalGates) / 3)
                        )
                      }
                    >
                      {Math.ceil(totalGates / 3) + 1}-{Math.ceil((2 * totalGates) / 3)}
                    </button>
                    <button
                      type="button"
                      className={styles.rangeButton}
                      onClick={() =>
                        selectGateRange(Math.ceil((2 * totalGates) / 3) + 1, totalGates)
                      }
                    >
                      {Math.ceil((2 * totalGates) / 3) + 1}-{totalGates}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Gate checkboxes grid */}
            <div className={styles.gatesGrid}>
              {gateNumbers.map((gateNum) => (
                <button
                  key={gateNum}
                  type="button"
                  className={`${styles.gateCheckbox} ${editingGroup.gates.has(gateNum) ? styles.gateSelected : ''}`}
                  onClick={() => toggleGate(gateNum)}
                  aria-pressed={editingGroup.gates.has(gateNum)}
                >
                  {gateNum}
                </button>
              ))}
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={cancelEdit}>
              Cancel
            </button>
            <button type="button" className={styles.saveButton} onClick={saveGroup}>
              {editingGroup.id ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface GroupItemProps {
  group: GateGroup
  isActive: boolean
  onActivate: () => void
  onEdit?: () => void
  onRemove?: () => void
}

function GroupItem({ group, isActive, onActivate, onEdit, onRemove }: GroupItemProps) {
  const gatesLabel =
    group.gates.length === 0
      ? 'All gates'
      : group.gates.length <= 5
        ? `Gates: ${group.gates.join(', ')}`
        : `${group.gates.length} gates`

  return (
    <div className={`${styles.groupItem} ${isActive ? styles.groupActive : ''}`}>
      <button className={styles.groupButton} onClick={onActivate}>
        {group.color && (
          <span
            className={styles.groupColor}
            style={{ backgroundColor: group.color }}
            aria-hidden="true"
          />
        )}
        <span className={styles.groupName}>{group.name}</span>
        <span className={styles.groupGates}>{gatesLabel}</span>
      </button>
      {(onEdit || onRemove) && (
        <div className={styles.groupActions}>
          {onEdit && (
            <button
              className={styles.iconButton}
              onClick={onEdit}
              aria-label={`Edit ${group.name}`}
            >
              ✎
            </button>
          )}
          {onRemove && (
            <button
              className={styles.iconButton}
              onClick={onRemove}
              aria-label={`Remove ${group.name}`}
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  )
}
