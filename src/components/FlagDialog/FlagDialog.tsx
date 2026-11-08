/**
 * FlagDialog - create or resolve a flag (podnět) on a gate
 *
 * Create mode: an operator disputes a call or asks for a video review.
 * Resolve mode: shows the original request read-only and collects an
 * optional resolution note.
 */

import { useId, useRef, useState, type RefObject } from 'react'
import {
  Modal,
  FormField,
  Textarea,
  Button,
  Radio,
} from '@opencanoetiming/timing-design-system'
import type { FlagEntry } from '../../types/checks'
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

  // The field the operator opened the dialog to fill. Passed to Modal
  // explicitly: DS 1.0 Modal's default initial focus lands on the header
  // close button, not on the first field in the body as documented.
  const firstFieldRef = useRef<HTMLTextAreaElement>(null)
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

  const footer = (
    <>
      {/* In the footer, not the body: the body is the one part of the dialog
          that scrolls, so an error inside it could sit below the fold on a
          long comment - exactly when the operator most needs to see it. The
          footer never scrolls. */}
      {error && (
        <div className={`form-error ${styles.error}`} role="alert">
          {error}
        </div>
      )}
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
    </>
  )

  // The DS Modal traps Tab, closes on Escape, focuses the first field in
  // the body and gives focus back to the opener on close.
  return (
    <Modal
      open
      onClose={onClose}
      title={isCreate ? 'Add flag' : 'Resolve flag'}
      footer={footer}
      // DS types initialFocus as RefObject<HTMLElement>; React 19's
      // useRef(null) is RefObject<T | null>, hence the cast.
      initialFocus={firstFieldRef as RefObject<HTMLElement>}
    >
      {isCreate ? (
        <>
          <FormField label="Comment" htmlFor={commentId}>
            <Textarea
              ref={firstFieldRef}
              id={commentId}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What is being disputed or should be reviewed?"
              rows={3}
              required
            />
          </FormField>

          <div className="form-group">
            <span className="form-label">Suggested value (optional)</span>
            <div className={styles.radioGroup}>
              {SUGGESTED_VALUE_OPTIONS.map((option) => (
                <Radio
                  key={option.label}
                  name="flag-suggested-value"
                  checked={suggestedValue === option.value}
                  onChange={() => setSuggestedValue(option.value)}
                  label={option.label}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="form-group">
            <span className="form-label">Comment</span>
            <p className={styles.readOnlyText}>{flag?.comment}</p>
          </div>

          <div className="form-group">
            <span className="form-label">Suggested value</span>
            <p className={styles.readOnlyText}>
              {formatSuggestedValue(flag?.suggestedValue)}
            </p>
          </div>

          <FormField label="Resolution note (optional)" htmlFor={resolutionId}>
            <Textarea
              ref={firstFieldRef}
              id={resolutionId}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="How was this resolved?"
              rows={3}
            />
          </FormField>
        </>
      )}
    </Modal>
  )
}
