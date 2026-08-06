import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultsGrid } from './ResultsGrid'
import type { C123ResultRow, C123RaceConfigData } from '../../types/c123server'
import type { GateGroup } from '../../types/ui'
import type { GateCheckStatus } from '../../types/checks'

// jsdom doesn't implement scrollBy - the grid calls it on every focus-position
// change to keep the focused cell in view.
HTMLElement.prototype.scrollBy = HTMLElement.prototype.scrollBy || vi.fn()

const raceConfig: C123RaceConfigData = {
  nrSplits: 0,
  nrGates: 6,
  gateConfig: 'NNNNNN',
  gateCaptions: '1,2,3,4,5,6',
}

function buildRow(overrides: Partial<C123ResultRow> = {}): C123ResultRow {
  return {
    rank: 1,
    bib: '42',
    name: 'Result Competitor',
    givenName: 'Result',
    familyName: 'Competitor',
    club: 'RC Club',
    nat: 'SVK',
    startOrder: 5,
    startTime: '',
    gates: '0 0 0 2 0 0',
    pen: 2,
    time: '95.21',
    total: '97.21',
    behind: '',
    status: undefined,
    ...overrides,
  }
}

// Gate 4 (index 3) has no value at all - three-char fixed-width blocks with
// a blank block, same format C123 sends for an unscored gate.
const rowWithEmptyGate = buildRow({
  gates: ['  0', '  0', '  0', '   ', '  0', '  2'].join(''),
})

interface RenderGridOptions {
  onToggleCheck?: (bib: string, gate: number) => void
  onVerifySection?: (bib: string, gates: number[]) => void
  activeGateGroup?: GateGroup | null
  allGateGroups?: GateGroup[]
  rows?: C123ResultRow[]
  getGateStatus?: (bib: string, gate: number) => GateCheckStatus
}

function renderGrid(options: RenderGridOptions = {}) {
  const {
    onToggleCheck,
    onVerifySection,
    activeGateGroup = null,
    // Defaults allGateGroups to [activeGateGroup] so tests that only set an
    // active group (as the task brief's examples do) still resolve a section
    // via sectionGatesFor, which looks the gate up in allGateGroups.
    allGateGroups = activeGateGroup ? [activeGateGroup] : [],
    rows = [buildRow()],
    getGateStatus,
  } = options

  return render(
    <ResultsGrid
      rows={rows}
      raceConfig={raceConfig}
      raceId="race-001"
      activeGateGroup={activeGateGroup}
      allGateGroups={allGateGroups}
      sortBy="rank"
      onPenaltySubmit={vi.fn()}
      onToggleCheck={onToggleCheck}
      onVerifySection={onVerifySection}
      getGateStatus={getGateStatus}
    />
  )
}

// Space/Shift+Space are handled by the grid's onKeyDown, which fires once DOM
// focus is inside it. Clicking a cell moves focus to the scrollable content
// pane (not the outer role="grid" div), so events must be dispatched at
// document.activeElement - the currently focused element - to bubble up to
// the handler, exactly as a real keypress would. Dispatching on `document`
// itself does not bubble down into the tree and never reaches the handler.
function pressKey(key: string, options: { shiftKey?: boolean } = {}) {
  fireEvent.keyDown(document.activeElement!, { key, ...options })
}

describe('ResultsGrid keyboard verification', () => {
  it('toggles a check on Space', () => {
    const onToggleCheck = vi.fn()
    renderGrid({ onToggleCheck })

    const cell = screen.getAllByRole('gridcell')[0]
    fireEvent.click(cell)
    pressKey(' ')

    expect(onToggleCheck).toHaveBeenCalledWith('42', 1)
  })

  it('verifies the whole section on Shift+Space', () => {
    const onVerifySection = vi.fn()
    renderGrid({ onVerifySection, activeGateGroup: { id: 'g1', name: 'A', gates: [1, 2, 3] } })

    fireEvent.click(screen.getAllByRole('gridcell')[0])
    pressKey(' ', { shiftKey: true })

    expect(onVerifySection).toHaveBeenCalledWith('42', [1, 2, 3])
  })

  it('falls back to a single-gate section when no gate groups are defined (Rule 1)', () => {
    const onVerifySection = vi.fn()
    renderGrid({ onVerifySection, activeGateGroup: null, allGateGroups: [] })

    fireEvent.click(screen.getAllByRole('gridcell')[0])
    pressKey(' ', { shiftKey: true })

    expect(onVerifySection).toHaveBeenCalledWith('42', [1])
  })

  it('does nothing on Space over an empty gate, and announces why (Rule 3)', () => {
    const onToggleCheck = vi.fn()
    renderGrid({ onToggleCheck, rows: [rowWithEmptyGate] })

    // Cell clicks are debounced (multi-tap detection), so drive focus to
    // gate 4 (index 3, no value in rowWithEmptyGate) via arrow keys instead
    // of relying on the click's delayed position update.
    pressKey('ArrowRight')
    pressKey('ArrowRight')
    pressKey('ArrowRight')
    pressKey(' ')

    expect(onToggleCheck).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(/gate 4.*empty/i)
  })

  it('still toggles a non-empty gate that is already verified (unverify is the consumer’s call)', () => {
    const onToggleCheck = vi.fn()
    const getGateStatus = vi.fn().mockReturnValue('verified' as GateCheckStatus)
    renderGrid({ onToggleCheck, getGateStatus })

    fireEvent.click(screen.getAllByRole('gridcell')[0])
    pressKey(' ')

    expect(onToggleCheck).toHaveBeenCalledWith('42', 1)
  })

  it('Shift+Space never falls through to the toggle callback, even on an already-verified gate', () => {
    const onToggleCheck = vi.fn()
    const onVerifySection = vi.fn()
    const getGateStatus = vi.fn().mockReturnValue('verified' as GateCheckStatus)
    renderGrid({
      onToggleCheck,
      onVerifySection,
      getGateStatus,
      activeGateGroup: { id: 'g1', name: 'A', gates: [1, 2, 3] },
    })

    fireEvent.click(screen.getAllByRole('gridcell')[0])
    pressKey(' ', { shiftKey: true })

    expect(onVerifySection).toHaveBeenCalledWith('42', [1, 2, 3])
    expect(onToggleCheck).not.toHaveBeenCalled()
  })
})

describe('ResultsGrid section boundary click target', () => {
  it('verifies the section when the boundary handle is clicked', () => {
    const onVerifySection = vi.fn()
    const onPenaltySubmit = vi.fn()
    render(
      <ResultsGrid
        rows={[buildRow()]}
        raceConfig={raceConfig}
        raceId="race-001"
        activeGateGroup={null}
        allGateGroups={[{ id: 'g1', name: 'A', gates: [1, 2, 3] }]}
        sortBy="rank"
        onPenaltySubmit={onPenaltySubmit}
        onVerifySection={onVerifySection}
      />
    )

    const handle = screen.getByRole('button', { name: /verify section ending at gate 3/i })
    fireEvent.click(handle)

    expect(onVerifySection).toHaveBeenCalledWith('42', [1, 2, 3])
    // The handle's click must not fall through to the cell's own click
    // handling (multi-tap penalty entry) underneath it.
    expect(onPenaltySubmit).not.toHaveBeenCalled()
  })

  it('does not render a boundary handle when no gate groups are defined (Rule 1)', () => {
    renderGrid({ activeGateGroup: null, allGateGroups: [] })

    expect(screen.queryByRole('button', { name: /verify section/i })).not.toBeInTheDocument()
  })
})
