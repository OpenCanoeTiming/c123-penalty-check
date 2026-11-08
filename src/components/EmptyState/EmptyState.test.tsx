import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState, type EmptyStateVariant } from './EmptyState'

describe('EmptyState', () => {
  it.each<[EmptyStateVariant, string | null, boolean]>([
    ['disconnected', 'empty-state-error', false],
    ['no-races', 'empty-state-info', false],
    ['no-competitors', 'empty-state-info', false],
    ['loading', null, true],
    ['discovering', 'empty-state-info', true],
  ])('maps %s to the DS tone and busy state', (variant, toneClass, busy) => {
    render(<EmptyState variant={variant} />)
    const el = screen.getByTestId('empty-state')
    expect(el).toHaveAttribute('data-variant', variant)
    expect(el).toHaveClass('empty-state', 'empty-state-card', 'empty-state-fill')
    const tones = [...el.classList].filter((c) =>
      /^empty-state-(success|warning|error|info)$/.test(c)
    )
    expect(tones).toEqual(toneClass ? [toneClass] : [])
    expect(el.classList.contains('empty-state-busy')).toBe(busy)
    if (busy) expect(el).toHaveAttribute('aria-busy', 'true')
    else expect(el).not.toHaveAttribute('aria-busy')
  })

  it('lets the caller override title and message', () => {
    render(<EmptyState variant="no-races" title="Select a race" message="Pick one above." />)
    expect(screen.getByRole('heading', { level: 2, name: 'Select a race' })).toBeInTheDocument()
    expect(screen.getByText('Pick one above.')).toBeInTheDocument()
  })

  it('renders the action button and calls it', () => {
    const onClick = vi.fn()
    render(<EmptyState variant="disconnected" action={{ label: 'Open Settings', onClick }} />)
    fireEvent.click(screen.getByTestId('empty-state-action'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders no action row without an action', () => {
    render(<EmptyState variant="loading" />)
    expect(screen.queryByTestId('empty-state-action')).toBeNull()
  })
})
