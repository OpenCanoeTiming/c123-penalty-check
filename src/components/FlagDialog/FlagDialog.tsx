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
  /**
   * Why the last submit failed, or null. The dialog stays open showing this
   * so the operator can retry instead of guessing - and it is rendered as
   * text, not a title/tooltip, for the same reason the footer's
   * verification-unavailable notice is: a tooltip never appears on a touch
   * device, and this app is built for a tablet.
   */
  error?: string | null
  /** True while a submit is in flight - blocks a second one. */
  submitting?: boolean
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

export function FlagDialog({
  mode,
  flag,
  onSubmit,
  onClose,
  error = null,
  submitting = false,
}: FlagDialogProps) {
  const [comment, setComment] = useState('')
  const [suggestedValue, setSuggestedValue] = useState<number | null>(null)
  const [resolution, setResolution] = useState('')

  const dialogRef = useFocusTrap<HTMLDivElement>({ enabled: true })
  const commentId = useId()
  const resolutionId = useId()

  const isCreate = mode === 'create'
  // A comment is only required to create a flag - resolving one only ever
  // adds an optional note to a comment that already exists. A submit already
  // in flight disables it too, so a slow request cannot be fired twice.
  const isSubmitDisabled = (isCreate && comment.trim().length === 0) || submitting

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
    // The focus-trap ref goes on Modal itself (a forwardRef onto the .modal
    // element), not a wrapper div around its children - .modal-body's
    // scrolling and .modal's max-height both depend on ModalHeader/Body/
    // Footer being direct flex children of .modal. A wrapper div breaks that
    // layout contract: the body never gets a definite height, never
    // scrolls, and a long comment pushes the footer out of the dialog with
    // no way to reach it (see task-9 review, Important 1).
    <Modal open onClose={onClose} size="sm" ref={dialogRef}>
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

      {/* A direct child of .modal, deliberately not inside ModalBody. The
          body is the one element that scrolls (flex-grow: 1; overflow-y:
          auto), so an error placed inside it can sit below the fold on a
          long comment - exactly when the operator most needs to see it.
          Sitting between body and footer, it is always on screen. This does
          not break the layout contract the comment on <Modal> describes:
          that one is about not *wrapping* header/body/footer, which would
          cost the body its definite height; another flex-shrink: 0 sibling
          alongside them costs it nothing. */}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {submitting
            ? isCreate
              ? 'Adding…'
              : 'Resolving…'
            : isCreate
              ? 'Add flag'
              : 'Resolve'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
