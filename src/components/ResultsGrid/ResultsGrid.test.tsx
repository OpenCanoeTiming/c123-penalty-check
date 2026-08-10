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

    // The handle is aria-hidden (see M-3: fully reachable via Shift+Space,
    // not independently focusable/activatable, so it isn't announced as a
    // button to assistive tech) - query it by its title tooltip instead.
    const handle = screen.getByTitle('Verify section ending at gate 3')
    fireEvent.click(handle)

    expect(onVerifySection).toHaveBeenCalledWith('42', [1, 2, 3])
    // The handle's click must not fall through to the cell's own click
    // handling (multi-tap penalty entry) underneath it.
    expect(onPenaltySubmit).not.toHaveBeenCalled()
  })

  it('does not render a section handle when no gate groups are defined (Rule 1)', () => {
    renderGrid({ activeGateGroup: null, allGateGroups: [] })

    expect(screen.queryByTitle(/verify section/i)).not.toBeInTheDocument()
  })

  it('renders a handle for every section end in the row, including the last one (I-1)', () => {
    // groupBoundaries (the visual separator line) never includes the last
    // visible gate - correct for a separator, but the handle must not be
    // driven by that set, or the last section in every row has no click
    // target at all.
    renderGrid({
      activeGateGroup: null,
      allGateGroups: [
        { id: 'gA', name: 'A', gates: [1, 2, 3] },
        { id: 'gB', name: 'B', gates: [4, 5, 6] },
      ],
    })

    expect(screen.getByTitle('Verify section ending at gate 3')).toBeInTheDocument()
    expect(screen.getByTitle('Verify section ending at gate 6')).toBeInTheDocument()
  })

  it('still renders a handle in a filtered single-group view (I-1)', () => {
    // groupBoundaries is empty whenever only one group's gates are visible
    // (nothing differs from a "next" gate within the filtered set). A judge
    // filtered to one section is exactly who needs the handle most.
    const groupB = { id: 'gB', name: 'B', gates: [4, 5, 6] }
    renderGrid({
      activeGateGroup: groupB,
      allGateGroups: [{ id: 'gA', name: 'A', gates: [1, 2, 3] }, groupB],
    })

    expect(screen.getByTitle('Verify section ending at gate 6')).toBeInTheDocument()
  })

  it('does not let a populated "all gates" pseudo-group hijack a real section (M-1)', () => {
    // useGateGroups builds allGroups as [ALL_GATES_GROUP, ...segments,
    // ...custom], with the all-gates group first. Its gates array is empty
    // today, but sectionGatesFor must resolve through customGroups (which
    // strips id 'all'), not allGateGroups directly - otherwise the moment
    // that pseudo-group's gates were ever populated, .find() would match it
    // before any real section and a click/Shift+Space would verify the
    // entire course in one press.
    const onVerifySection = vi.fn()
    const allGatesPseudoGroup: GateGroup = { id: 'all', name: 'All Gates', gates: [1, 2, 3, 4, 5, 6] }
    const realGroup: GateGroup = { id: 'g1', name: 'A', gates: [1, 2, 3] }
    render(
      <ResultsGrid
        rows={[buildRow()]}
        raceConfig={raceConfig}
        raceId="race-001"
        activeGateGroup={null}
        allGateGroups={[allGatesPseudoGroup, realGroup]}
        sortBy="rank"
        onPenaltySubmit={vi.fn()}
        onVerifySection={onVerifySection}
      />
    )

    fireEvent.click(screen.getByTitle('Verify section ending at gate 3'))

    expect(onVerifySection).toHaveBeenCalledWith('42', [1, 2, 3])
  })

  it('a long-press+click on the handle opens no context menu, verifies once, and does not block the next plain tap (C-2)', () => {
    vi.useFakeTimers()
    try {
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

      const handle = screen.getByTitle('Verify section ending at gate 3')
      // mousedown must not bubble to the cell's own long-press handling -
      // if it did, holding past LONG_PRESS_DURATION (500ms) would open the
      // penalty context menu underneath what looks like a single tap.
      fireEvent.mouseDown(handle)
      vi.advanceTimersByTime(600)
      expect(screen.queryByRole('menu', { name: /penalty options/i })).not.toBeInTheDocument()

      fireEvent.click(handle)
      expect(onVerifySection).toHaveBeenCalledWith('42', [1, 2, 3])

      // An unrelated cell's own double-tap must still register normally -
      // the handle interaction must not leave stray long-press state
      // (longPressTriggered) behind that swallows the next tap anywhere
      // in the grid.
      const otherCell = screen.getAllByRole('gridcell')[4] // gate 5, outside the section
      fireEvent.click(otherCell)
      fireEvent.click(otherCell)
      vi.advanceTimersByTime(400) // past the 300ms multi-tap debounce

      expect(onPenaltySubmit).toHaveBeenCalledWith('42', 5, 0, 'race-001')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('ResultsGrid empty-gate announcement', () => {
  it('re-announces on repeated Space presses over the same empty gate (M-2)', () => {
    renderGrid({ rows: [rowWithEmptyGate] })

    pressKey('ArrowRight')
    pressKey('ArrowRight')
    pressKey('ArrowRight')
    pressKey(' ')
    const first = screen.getByRole('status').textContent

    pressKey(' ')
    const second = screen.getByRole('status').textContent

    // A screen reader only re-announces an aria-live region on an actual
    // text change - an identical string is a no-op.
    expect(second).not.toBe(first)
    expect(first).toMatch(/gate 4.*empty/i)
    expect(second).toMatch(/gate 4.*empty/i)
  })
})

describe('ResultsGrid context menu verify wiring', () => {
  // The context menu's checkStatus/canVerify/onToggleCheck/onVerifySection
  // props are derived from the grid's own getGateStatus/onToggleCheck/
  // onVerifySection - the same plumbing the keyboard route already uses -
  // so a right-click reaches the same verify actions as Space/Shift+Space.
  it('shows Un-verify when the clicked cell is already verified', () => {
    const getGateStatus = vi.fn().mockReturnValue('verified' as GateCheckStatus)
    renderGrid({ getGateStatus })

    fireEvent.contextMenu(screen.getAllByRole('gridcell')[0])

    expect(screen.getByText('Un-verify gate')).toBeInTheDocument()
  })

  it('disables Verify gate in the menu for an empty gate', () => {
    renderGrid({ rows: [rowWithEmptyGate] })

    fireEvent.contextMenu(screen.getAllByRole('gridcell')[3]) // gate 4, empty in this fixture

    expect(screen.getByRole('menuitem', { name: /Verify gate/ })).toBeDisabled()
  })

  it("routes the menu's Verify gate action to onToggleCheck for the clicked cell", () => {
    const onToggleCheck = vi.fn()
    renderGrid({ onToggleCheck })

    fireEvent.contextMenu(screen.getAllByRole('gridcell')[0])
    fireEvent.click(screen.getByRole('menuitem', { name: /Verify gate/ }))

    expect(onToggleCheck).toHaveBeenCalledWith('42', 1)
  })

  it("routes the menu's Verify section action to onVerifySection for the clicked cell's section", () => {
    const onVerifySection = vi.fn()
    renderGrid({ onVerifySection, activeGateGroup: { id: 'g1', name: 'A', gates: [1, 2, 3] } })

    fireEvent.contextMenu(screen.getAllByRole('gridcell')[0])
    fireEvent.click(screen.getByText('Verify section'))

    expect(onVerifySection).toHaveBeenCalledWith('42', [1, 2, 3])
  })
})
