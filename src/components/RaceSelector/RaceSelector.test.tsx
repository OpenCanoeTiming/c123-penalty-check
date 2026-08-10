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

describe('RaceSelector verification indicator', () => {
  it('marks a fully verified race as done', () => {
    render(
      <RaceSelector {...base} getRaceCheckState={() => ({ checked: 8, total: 8, done: true })} />
    )
    expect(screen.getByLabelText(/verified/i)).toBeInTheDocument()
  })

  it('shows progress while a race is partly verified', () => {
    render(
      <RaceSelector {...base} getRaceCheckState={() => ({ checked: 3, total: 8, done: false })} />
    )
    expect(screen.getByText('3/8')).toBeInTheDocument()
  })

  it('shows nothing when there is nothing to verify yet', () => {
    render(
      <RaceSelector {...base} getRaceCheckState={() => ({ checked: 0, total: 0, done: false })} />
    )
    expect(screen.queryByText('0/0')).not.toBeInTheDocument()
    // Also confirm no checkmark sneaks in via the done branch - a state
    // where total is 0 must never read as verified either.
    expect(screen.queryByLabelText(/verified/i)).not.toBeInTheDocument()
  })

  it('renders nothing when getRaceCheckState is not provided', () => {
    render(<RaceSelector {...base} />)
    expect(screen.queryByLabelText(/verified/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\d\/\d/)).not.toBeInTheDocument()
  })

  // The next two tests cover a caller whose `done` flag disagrees with its
  // own `checked`/`total` - a bug in whatever eventually wires this up
  // (task 11), a stale snapshot, anything. The indicator must not take
  // `done` at face value: see the comment on raceCheckIndicator in
  // RaceSelector.tsx. Without these, a regression that trusts `state.done`
  // directly (or loosens `===` to `>=`) would pass the two tests above
  // unnoticed, since both of those always give a `done` that agrees with
  // the counts.

  it('never marks a race done from checked exceeding total, even if the caller claims done', () => {
    render(
      <RaceSelector {...base} getRaceCheckState={() => ({ checked: 9, total: 8, done: true })} />
    )
    expect(screen.queryByLabelText(/verified/i)).not.toBeInTheDocument()
    expect(screen.getByText('9/8')).toBeInTheDocument()
  })

  it('never marks a zero-total race done, even if the caller claims done', () => {
    render(
      <RaceSelector {...base} getRaceCheckState={() => ({ checked: 0, total: 0, done: true })} />
    )
    expect(screen.queryByLabelText(/verified/i)).not.toBeInTheDocument()
    expect(screen.queryByText('0/0')).not.toBeInTheDocument()
  })

  it('looks up check state per race rather than sharing one state across the list', () => {
    const races = [
      buildRace({ raceId: 'race-001', displayTitle: 'K1m - 1. jízda' }),
      buildRace({ raceId: 'race-002', displayTitle: 'C1w - 1. jízda' }),
    ]
    const getRaceCheckState = vi.fn((raceId: string) =>
      raceId === 'race-001' ? { checked: 8, total: 8, done: true } : { checked: 2, total: 5, done: false }
    )

    render(<RaceSelector {...base} races={races} getRaceCheckState={getRaceCheckState} />)

    expect(getRaceCheckState).toHaveBeenCalledWith('race-001')
    expect(getRaceCheckState).toHaveBeenCalledWith('race-002')
    expect(screen.getByLabelText(/verified/i)).toBeInTheDocument()
    expect(screen.getByText('2/5')).toBeInTheDocument()
  })
})
