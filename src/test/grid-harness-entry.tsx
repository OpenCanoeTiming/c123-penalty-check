/**
 * Dev-server-only harness for Playwright specs that need real browser layout
 * (glyph metrics, hit-testing) - jsdom cannot provide either. Renders the
 * real ResultsGrid with the real compiled CSS module. Not part of the
 * production build (see grid-harness.html at the repo root for why).
 *
 * One 8-gate section so gate 8 is both the last gate of the group and a
 * section end - one row per penalty value PenaltyCell actually renders as
 * text (0, 2, 50), each carrying that value at gate 8, so a Playwright spec
 * can measure the rendered glyph against the section handle at that column
 * for every value the feature has to keep legible.
 */
import { createRoot } from 'react-dom/client'
import { ResultsGrid } from '../components/ResultsGrid/ResultsGrid'
import type { C123ResultRow, C123RaceConfigData } from '../types/c123server'
import type { GateGroup } from '../types/ui'
import '@opencanoetiming/timing-design-system/src/tokens/index.css'
import '@opencanoetiming/timing-design-system/src/css/index.css'
import '../index.css'

const raceConfig: C123RaceConfigData = {
  nrSplits: 1,
  nrGates: 8,
  gateConfig: 'NNNNNNNN',
  gateCaptions: '1,2,3,4,5,6,7,8',
}

const allGateGroups: GateGroup[] = [{ id: 'group-1', name: 'Gates 1-8', gates: [1, 2, 3, 4, 5, 6, 7, 8] }]

function rowWithGate8Value(bib: string, gate8Value: string): C123ResultRow {
  const gates = Array.from({ length: 8 }, (_, i) => (i === 7 ? gate8Value : '0')).join(' ')
  return {
    rank: Number(bib),
    bib,
    name: `Row ${bib}`,
    givenName: '',
    familyName: '',
    club: '',
    nat: '',
    startOrder: Number(bib),
    startTime: '',
    gates,
    pen: gate8Value === '' ? 0 : Number(gate8Value),
    time: '95.00',
    total: '95.00',
    behind: '',
    status: undefined,
  }
}

// The only values PenaltyCell renders as text at all - anything else
// (52/100/150, team-race cumulative values) falls through to .penaltyEmpty
// with value = '' and so cannot be clipped, because nothing is painted.
const rows: C123ResultRow[] = [
  rowWithGate8Value('1', '0'),
  rowWithGate8Value('2', '2'),
  rowWithGate8Value('3', '50'),
]

const root = document.getElementById('root')!
createRoot(root).render(
  <ResultsGrid
    rows={rows}
    raceConfig={raceConfig}
    raceId="race-001"
    activeGateGroup={null}
    allGateGroups={allGateGroups}
    sortBy="bib"
    onPenaltySubmit={() => {}}
  />
)
