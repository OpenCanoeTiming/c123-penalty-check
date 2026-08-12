import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RaceSelector } from './RaceSelector'
import type { ProcessedRace } from '../../hooks/useSchedule'

function buildRace(overrides: Partial<ProcessedRace> = {}): ProcessedRace {
  return {
    raceId: 'race-001',
    order: 1,
    mainTitle: 'K1m',
    subTitle: 'střední trať',
    shortTitle: 'K1m - 1. jízda',
    displayTitle: 'K1m - 1. jízda',
    date: null,
    courseNr: null,
    raceStatus: 5,
    startTime: '10:00:00',
    isActive: true,
    isRunning: false,
    isFinished: true,
    ...overrides,
  }
}

const base = {
  races: [buildRace()],
  selectedRaceId: 'race-001',
  onSelectRace: vi.fn(),
  onlyRunning: false,
  onToggleOnlyRunning: vi.fn(),
}

// The indicator is rendered as plain text appended to each <option>'s own
// text - a native <select> never lays out an <option>'s children, so an
// element (a <span>, an aria-label on one) would exist in the DOM but be
// invisible and unreachable by assistive tech. `getByRole('option', { name })`
// reads the option's actual accessible name (its flattened text), which
// holds identically in jsdom and in a real browser - unlike `getByLabelText`
// or a query against a nested node, which would only ever hold in jsdom.
describe('RaceSelector verification indicator', () => {
  it('marks a fully verified race as done', () => {
    render(<RaceSelector {...base} getRaceCheckState={() => ({ checked: 8, total: 8, openFlags: 0 })} />)
    expect(screen.getByRole('option', { name: /✓/ })).toBeInTheDocument()
  })

  it('shows progress while a race is partly verified', () => {
    render(<RaceSelector {...base} getRaceCheckState={() => ({ checked: 3, total: 8, openFlags: 0 })} />)
    expect(screen.getByRole('option', { name: /3\/8/ })).toBeInTheDocument()
  })

  it('shows nothing when there is nothing to verify yet', () => {
    render(<RaceSelector {...base} getRaceCheckState={() => ({ checked: 0, total: 0, openFlags: 0 })} />)
    expect(screen.queryByRole('option', { name: /\d\/\d/ })).not.toBeInTheDocument()
    // checked === total holds here too (0 === 0) - this also confirms the
    // "done" branch requires total > 0 as its own guard, not just equal
    // counts, since equality alone would wrongly read this race as verified.
    expect(screen.queryByRole('option', { name: /✓/ })).not.toBeInTheDocument()
  })

  it('renders nothing when getRaceCheckState is not provided', () => {
    render(<RaceSelector {...base} />)
    expect(screen.queryByRole('option', { name: /✓/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /\d\/\d/ })).not.toBeInTheDocument()
  })

  // "Done" is derived here from checked/total, not taken as a given flag
  // (see the comment on raceCheckIndicator in RaceSelector.tsx). checked
  // exceeding total should never happen from a correct getRaceProgress, but
  // this guards the derivation itself: exact equality, not `checked >= total`.
  it('does not mark a race done when checked exceeds total', () => {
    render(<RaceSelector {...base} getRaceCheckState={() => ({ checked: 9, total: 8, openFlags: 0 })} />)
    expect(screen.queryByRole('option', { name: /✓/ })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /9\/8/ })).toBeInTheDocument()
  })

  // Pins the new rule: an unresolved flag must keep a fully-checked race
  // from reading done, same as getRaceProgress (src/hooks/useChecks.ts).
  // Falls through to the ratio branch, same as the "checked exceeds total"
  // case above - the tick is reserved for "nothing left to look at".
  it('does not mark a race done while an open flag remains, even with every gate checked', () => {
    render(<RaceSelector {...base} getRaceCheckState={() => ({ checked: 8, total: 8, openFlags: 1 })} />)
    expect(screen.queryByRole('option', { name: /✓/ })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /8\/8/ })).toBeInTheDocument()
  })

  it('looks up check state per race rather than sharing one state across the list', () => {
    const races = [
      buildRace({ raceId: 'race-001', displayTitle: 'K1m - 1. jízda' }),
      buildRace({ raceId: 'race-002', displayTitle: 'C1w - 1. jízda' }),
    ]
    const getRaceCheckState = vi.fn((raceId: string) =>
      raceId === 'race-001' ? { checked: 8, total: 8, openFlags: 0 } : { checked: 2, total: 5, openFlags: 0 }
    )

    render(<RaceSelector {...base} races={races} getRaceCheckState={getRaceCheckState} />)

    expect(getRaceCheckState).toHaveBeenCalledWith('race-001')
    expect(getRaceCheckState).toHaveBeenCalledWith('race-002')
    expect(screen.getByRole('option', { name: 'K1m - 1. jízda ✓' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'C1w - 1. jízda 2/5' })).toBeInTheDocument()
  })
})
