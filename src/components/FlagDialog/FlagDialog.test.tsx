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
