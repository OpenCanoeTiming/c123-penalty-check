import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlagDialog } from './FlagDialog'
import type { FlagEntry } from '../../types/checks'

const flag: FlagEntry = {
  id: 'f1',
  bib: '42',
  gate: 3,
  createdAt: 't',
  comment: 'Judge disputes the touch call',
  suggestedValue: 2,
  resolved: false,
}

describe('FlagDialog create mode', () => {
  it('disables submit while the comment is empty', () => {
    render(<FlagDialog mode="create" onSubmit={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add flag' })).toBeDisabled()
  })

  it('disables submit while the comment is only whitespace', () => {
    render(<FlagDialog mode="create" onSubmit={vi.fn()} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: '   ' },
    })

    expect(screen.getByRole('button', { name: 'Add flag' })).toBeDisabled()
  })

  it('enables submit once a comment is entered', () => {
    render(<FlagDialog mode="create" onSubmit={vi.fn()} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: 'Please review on video' },
    })

    expect(screen.getByRole('button', { name: 'Add flag' })).not.toBeDisabled()
  })

  it('submits the trimmed comment with no suggested value by default', () => {
    const onSubmit = vi.fn()
    render(<FlagDialog mode="create" onSubmit={onSubmit} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: '  Please review on video  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add flag' }))

    expect(onSubmit).toHaveBeenCalledWith({
      comment: 'Please review on video',
      suggestedValue: null,
    })
  })

  it('submits the selected suggested value', () => {
    const onSubmit = vi.fn()
    render(<FlagDialog mode="create" onSubmit={onSubmit} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: 'Missed gate?' },
    })
    fireEvent.click(screen.getByText('50 (Missed)'))
    fireEvent.click(screen.getByRole('button', { name: 'Add flag' }))

    expect(onSubmit).toHaveBeenCalledWith({
      comment: 'Missed gate?',
      suggestedValue: 50,
    })
  })

  it('does not show resolve-mode fields', () => {
    render(<FlagDialog mode="create" onSubmit={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByLabelText(/Resolution note/)).not.toBeInTheDocument()
  })

  it('keeps the footer reachable with a long comment - header/body/footer are direct children of the modal, not wrapped in an extra div', () => {
    // .modal-body's scrolling (overflow-y: auto; flex-grow: 1) and .modal's
    // max-height only apply while ModalHeader/ModalBody/ModalFooter are
    // direct flex children of .modal. A focus-trap wrapper div around them
    // breaks that layout contract and pushes the footer (Cancel/Add flag or
    // Cancel/Resolve) out of the dialog with nothing to scroll it back into
    // view - see task-9 review, Important 1. jsdom does not compute real
    // layout/scrolling, so this pins the DOM structure the CSS depends on
    // instead of the pixels.
    render(<FlagDialog mode="create" onSubmit={vi.fn()} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: 'x'.repeat(2000) },
    })

    const dialog = screen.getByRole('dialog')
    const directChildClasses = Array.from(dialog.children).map(
      (el) => el.className
    )

    expect(directChildClasses).toEqual([
      expect.stringContaining('modal-header'),
      expect.stringContaining('modal-body'),
      expect.stringContaining('modal-footer'),
    ])
    // The footer - and the submit button inside it - is still part of the
    // dialog's own DOM regardless of comment length.
    expect(screen.getByRole('button', { name: 'Add flag' })).toBeInTheDocument()
  })
})

describe('FlagDialog resolve mode', () => {
  it('shows the flag comment and suggested value read-only', () => {
    render(
      <FlagDialog
        mode="resolve"
        flag={flag}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(
      screen.getByText('Judge disputes the touch call')
    ).toBeInTheDocument()
    expect(screen.getByText('2 (Touch)')).toBeInTheDocument()
    // Read-only, not an editable comment field
    expect(screen.queryByLabelText('Comment')).not.toBeInTheDocument()
  })

  it('shows None when the flag has no suggested value', () => {
    render(
      <FlagDialog
        mode="resolve"
        flag={{ ...flag, suggestedValue: undefined }}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('never disables submit - the resolution note is optional', () => {
    render(
      <FlagDialog
        mode="resolve"
        flag={flag}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Resolve' })).not.toBeDisabled()
  })

  it('submits with no resolution when the note is left blank', () => {
    const onSubmit = vi.fn()
    render(
      <FlagDialog
        mode="resolve"
        flag={flag}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))

    expect(onSubmit).toHaveBeenCalledWith({ resolution: undefined })
  })

  it('submits the trimmed resolution note', () => {
    const onSubmit = vi.fn()
    render(
      <FlagDialog
        mode="resolve"
        flag={flag}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText(/Resolution note/), {
      target: { value: '  Reviewed, call stands  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))

    expect(onSubmit).toHaveBeenCalledWith({
      resolution: 'Reviewed, call stands',
    })
  })
})

describe('FlagDialog close', () => {
  it('calls onClose without submitting when Cancel is clicked', () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    render(<FlagDialog mode="create" onSubmit={onSubmit} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('FlagDialog submit failure', () => {
  it('shows the failure reason as text, not a title attribute', () => {
    // A title tooltip never appears on a touch device and this is a tablet
    // app - same reason the footer's verification-unavailable notice is
    // rendered as text.
    render(
      <FlagDialog
        mode="resolve"
        flag={flag}
        error="Could not reach the server"
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server')
  })

  it('renders no alert region while there is no error', () => {
    render(<FlagDialog mode="resolve" flag={flag} onSubmit={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps Cancel usable while showing an error, so a retry is never the only way out', () => {
    const onClose = vi.fn()
    render(
      <FlagDialog
        mode="resolve"
        flag={flag}
        error="Could not reach the server"
        onSubmit={vi.fn()}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('leaves the error visible so the operator can submit again', () => {
    const onSubmit = vi.fn()
    render(
      <FlagDialog
        mode="resolve"
        flag={flag}
        error="Could not reach the server"
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('FlagDialog submitting', () => {
  it('disables submit while a request is in flight, so it cannot be fired twice', () => {
    const onSubmit = vi.fn()
    render(
      <FlagDialog
        mode="resolve"
        flag={flag}
        submitting
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    )

    const button = screen.getByRole('button', { name: 'Resolving…' })
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('says what it is doing rather than leaving a dead-looking button', () => {
    const { rerender } = render(
      <FlagDialog mode="create" submitting onSubmit={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Adding…' })).toBeInTheDocument()

    rerender(<FlagDialog mode="resolve" flag={flag} submitting onSubmit={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Resolving…' })).toBeInTheDocument()
  })

  it('still disables create-mode submit on an empty comment even when not submitting', () => {
    render(<FlagDialog mode="create" onSubmit={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add flag' })).toBeDisabled()
  })
})
