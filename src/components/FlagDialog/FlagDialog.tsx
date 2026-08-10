/**
 * FlagDialog - create or resolve a flag (podnět) on a gate
 *
 * Create mode: an operator disputes a call or asks for a video review.
 * Resolve mode: shows the original request read-only and collects an
 * optional resolution note.
 */

import { useId, useState } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
  Button,
  Radio,
} from '@opencanoetiming/timing-design-system'
import type { FlagEntry } from '../../types/checks'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import styles from './FlagDialog.module.css'

export interface FlagDialogSubmitInput {
  comment?: string
  suggestedValue?: number | null
  resolution?: string
}

export interface FlagDialogProps {
  /** 'create' opens a blank flag; 'resolve' closes out an existing one */
  mode: 'create' | 'resolve'
  /** Required in 'resolve' mode - the flag being resolved */
  flag?: FlagEntry
  /** Callback with the new comment/suggestion (create) or resolution note (resolve) */
  onSubmit: (input: FlagDialogSubmitInput) => void
  /** Callback to close the dialog without submitting */
  onClose: () => void
}

const SUGGESTED_VALUE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'None' },
  { value: 0, label: '0 (Clear)' },
  { value: 2, label: '2 (Touch)' },
  { value: 50, label: '50 (Missed)' },
]

/** Format a suggested value for read-only display in resolve mode */
function formatSuggestedValue(value: number | null | undefined): string {
  const match = SUGGESTED_VALUE_OPTIONS.find(
    (option) => option.value === (value ?? null)
  )
  return match ? match.label : String(value)
}

export function FlagDialog({ mode, flag, onSubmit, onClose }: FlagDialogProps) {
  const [comment, setComment] = useState('')
  const [suggestedValue, setSuggestedValue] = useState<number | null>(null)
  const [resolution, setResolution] = useState('')

  const dialogRef = useFocusTrap<HTMLDivElement>({ enabled: true })
  const commentId = useId()
  const resolutionId = useId()

  const isCreate = mode === 'create'
  // A comment is only required to create a flag - resolving one only ever
  // adds an optional note to a comment that already exists.
  const isSubmitDisabled = isCreate && comment.trim().length === 0

  const handleSubmit = () => {
    if (isSubmitDisabled) return

    if (isCreate) {
      onSubmit({ comment: comment.trim(), suggestedValue })
      return
    }

    const trimmedResolution = resolution.trim()
    onSubmit({
      resolution: trimmedResolution.length > 0 ? trimmedResolution : undefined,
    })
  }

  return (
    <Modal open onClose={onClose} size="sm">
      <div ref={dialogRef}>
        <ModalHeader>
          <ModalTitle>{isCreate ? 'Add flag' : 'Resolve flag'}</ModalTitle>
          <ModalClose onClick={onClose} />
        </ModalHeader>

        <ModalBody>
          {isCreate ? (
            <>
              <div className={styles.formField}>
                <label htmlFor={commentId} className={styles.label}>
                  Comment
                </label>
                <textarea
                  id={commentId}
                  className={styles.textarea}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What is being disputed or should be reviewed?"
                  rows={3}
                  required
                />
              </div>

              <div className={styles.formField}>
                <span className={styles.label}>Suggested value (optional)</span>
                <div className={styles.radioGroup}>
                  {SUGGESTED_VALUE_OPTIONS.map((option) => (
                    <Radio
                      key={option.label}
                      name="flag-suggested-value"
                      checked={suggestedValue === option.value}
                      onChange={() => setSuggestedValue(option.value)}
                    >
                      {option.label}
                    </Radio>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.formField}>
                <span className={styles.label}>Comment</span>
                <p className={styles.readOnlyText}>{flag?.comment}</p>
              </div>

              <div className={styles.formField}>
                <span className={styles.label}>Suggested value</span>
                <p className={styles.readOnlyText}>
                  {formatSuggestedValue(flag?.suggestedValue)}
                </p>
              </div>

              <div className={styles.formField}>
                <label htmlFor={resolutionId} className={styles.label}>
                  Resolution note (optional)
                </label>
                <textarea
                  id={resolutionId}
                  className={styles.textarea}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="How was this resolved?"
                  rows={3}
                />
              </div>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            {isCreate ? 'Add flag' : 'Resolve'}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  )
}
