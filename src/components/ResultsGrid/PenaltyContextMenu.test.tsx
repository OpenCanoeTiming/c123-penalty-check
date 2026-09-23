import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PenaltyContextMenu } from './PenaltyContextMenu'
import type { FlagEntry } from '../../types/checks'

const openFlag: FlagEntry = {
  id: 'f1',
  bib: '42',
  gate: 3,
  createdAt: 't',
  comment: 'c',
  resolved: false,
}

const base = {
  x: 0,
  y: 0,
  currentValue: 2 as const,
  onSelect: vi.fn(),
  onClose: vi.fn(),
  checkStatus: 'plain' as const,
  canVerify: true,
  openFlag: null,
  onToggleCheck: vi.fn(),
  onVerifySection: vi.fn(),
  onAddFlag: vi.fn(),
  onResolveFlag: vi.fn(),
}

describe('PenaltyContextMenu verify actions', () => {
  it('offers Verify on an unverified gate', () => {
    render(<PenaltyContextMenu {...base} />)
    expect(screen.getByText('Verify gate')).toBeInTheDocument()
  })

  it('offers Un-verify on a verified gate', () => {
    render(<PenaltyContextMenu {...base} checkStatus="verified" />)
    expect(screen.getByText('Un-verify gate')).toBeInTheDocument()
  })

  it('offers Un-verify on a stale gate (a check entry still exists)', () => {
    render(<PenaltyContextMenu {...base} checkStatus="stale" />)
    expect(screen.getByText('Un-verify gate')).toBeInTheDocument()
  })

  it('disables Verify on an empty gate', () => {
    render(
      <PenaltyContextMenu {...base} currentValue={null} canVerify={false} />
    )
    expect(screen.getByRole('menuitem', { name: /Verify gate/ })).toBeDisabled()
  })

  it('gives a reason when Verify is disabled', () => {
    render(
      <PenaltyContextMenu {...base} currentValue={null} canVerify={false} />
    )
    expect(
      screen.getByRole('menuitem', { name: /Verify gate/ })
    ).toHaveAttribute('title', 'Enter a penalty value first')
  })

  it('keeps Un-verify enabled on an already-verified gate even without a current value', () => {
    // canVerify only ever governs the empty->verify path; un-verifying an
    // existing check must not depend on a value still being present.
    render(
      <PenaltyContextMenu {...base} checkStatus="verified" canVerify={false} />
    )
    expect(
      screen.getByRole('menuitem', { name: /Un-verify gate/ })
    ).not.toBeDisabled()
  })

  it('always offers Verify section, regardless of check status', () => {
    render(<PenaltyContextMenu {...base} />)
    expect(screen.getByText('Verify section')).toBeInTheDocument()
  })

  it('calls onToggleCheck and closes when Verify gate is clicked', () => {
    const onToggleCheck = vi.fn()
    const onClose = vi.fn()
    render(
      <PenaltyContextMenu
        {...base}
        onToggleCheck={onToggleCheck}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByRole('menuitem', { name: /Verify gate/ }))

    expect(onToggleCheck).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onVerifySection and closes when Verify section is clicked', () => {
    const onVerifySection = vi.fn()
    const onClose = vi.fn()
    render(
      <PenaltyContextMenu
        {...base}
        onVerifySection={onVerifySection}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByRole('menuitem', { name: /Verify section/ }))

    expect(onVerifySection).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('PenaltyContextMenu flag actions', () => {
  it('offers Add flag when there is no open flag', () => {
    render(<PenaltyContextMenu {...base} openFlag={null} />)
    expect(screen.getByText('Add flag…')).toBeInTheDocument()
    expect(screen.queryByText('Resolve flag…')).not.toBeInTheDocument()
  })

  it('offers Resolve instead of Add when a flag is open', () => {
    render(<PenaltyContextMenu {...base} openFlag={openFlag} />)
    expect(screen.getByText('Resolve flag…')).toBeInTheDocument()
    expect(screen.queryByText('Add flag…')).not.toBeInTheDocument()
  })

  it('treats a resolved flag as no flag - offers Add, not Resolve', () => {
    render(
      <PenaltyContextMenu
        {...base}
        openFlag={{ ...openFlag, resolved: true }}
      />
    )
    expect(screen.getByText('Add flag…')).toBeInTheDocument()
    expect(screen.queryByText('Resolve flag…')).not.toBeInTheDocument()
  })

  it('calls onAddFlag and closes when Add flag is clicked', () => {
    const onAddFlag = vi.fn()
    const onClose = vi.fn()
    render(
      <PenaltyContextMenu
        {...base}
        openFlag={null}
        onAddFlag={onAddFlag}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByText('Add flag…'))

    expect(onAddFlag).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onResolveFlag with the open flag and closes when Resolve flag is clicked', () => {
    const onResolveFlag = vi.fn()
    const onClose = vi.fn()
    render(
      <PenaltyContextMenu
        {...base}
        openFlag={openFlag}
        onResolveFlag={onResolveFlag}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByText('Resolve flag…'))

    expect(onResolveFlag).toHaveBeenCalledWith(openFlag)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('PenaltyContextMenu structure', () => {
  it('renders a separator between the value options and the verify/flag group', () => {
    render(<PenaltyContextMenu {...base} />)
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('still renders the original value options', () => {
    render(<PenaltyContextMenu {...base} />)
    expect(screen.getByText('Clear (0)')).toBeInTheDocument()
    expect(screen.getByText('Touch (2s)')).toBeInTheDocument()
    expect(screen.getByText('Missed (50s)')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })
})
