import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CheckProgress } from './CheckProgress'

function progress(overrides: Partial<{ checked: number; total: number; openFlags: number }> = {}) {
  const { checked = 0, total = 0, openFlags = 0 } = overrides
  return { checked, total, openFlags, percentage: total > 0 ? Math.round((checked / total) * 100) : 0 }
}

describe('CheckProgress', () => {
  it('renders as complete when every gate is checked and no flag is open', () => {
    render(<CheckProgress progress={progress({ checked: 5, total: 5, openFlags: 0 })} />)
    expect(screen.getByRole('progressbar')).toHaveClass('progress-success')
    expect(screen.getByText('5/5')).toHaveClass('check-progress__text--complete')
  })

  // Pins the same rule as getRaceProgress (src/hooks/useChecks.ts) and
  // RaceSelector's race-switcher tick, via the shared isProgressDone: the
  // footer bar must not read "complete" (green, checkmark styling) while a
  // flag on a counted gate is still open, even once every gate is checked -
  // otherwise the footer would tell the head judge "done" on the same
  // screen where the switcher correctly withholds its own tick.
  it('does not render as complete while an open flag remains, even with every gate checked', () => {
    render(<CheckProgress progress={progress({ checked: 5, total: 5, openFlags: 1 })} />)
    expect(screen.getByRole('progressbar')).not.toHaveClass('progress-success')
    expect(screen.getByText('5/5')).not.toHaveClass('check-progress__text--complete')
  })

  it('renders as incomplete while gates remain unchecked', () => {
    render(<CheckProgress progress={progress({ checked: 3, total: 5, openFlags: 0 })} />)
    expect(screen.getByRole('progressbar')).not.toHaveClass('progress-success')
    expect(screen.getByText('3/5')).not.toHaveClass('check-progress__text--complete')
  })

  it('renders nothing when there is nothing to check yet', () => {
    render(<CheckProgress progress={progress({ checked: 0, total: 0, openFlags: 0 })} />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
