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
const glyphRows: C123ResultRow[] = [
  rowWithGate8Value('1', '0'),
  rowWithGate8Value('2', '2'),
  rowWithGate8Value('3', '50'),
]

/**
 * Extra rows for verification-state screenshots/measurement (task: make
 * .verified prominent - see visibility-report.md). Not used by
 * section-handle-glyph.spec.ts, which only reads bibs 1-3 at gate 8; these
 * exist to give getGateStatus something to paint across a realistic mix of
 * penalty values and to give a screenshot a visible block of verified cells
 * next to unverified ones, per that task's ask.
 */
function rowWithGates(bib: number, gateValues: string[]): C123ResultRow {
  const gates = gateValues.join(' ')
  const penGate = gateValues.find((v) => v !== '0') ?? '0'
  return {
    rank: bib,
    bib: String(bib),
    name: `Row ${bib}`,
    givenName: '',
    familyName: '',
    club: '',
    nat: '',
    startOrder: bib,
    startTime: '',
    gates,
    pen: Number(penGate),
    time: '95.00',
    total: '95.00',
    behind: '',
    status: undefined,
  }
}

// Repeating 0/2/50 mix across the 8 gates so both halves of the row (verified
// gates 1-4, plain gates 5-8 below) show all three penalty-value backgrounds,
// not just clear.
const verificationDemoPattern = ['0', '2', '50', '0', '0', '2', '50', '0']
const verificationRows: C123ResultRow[] = Array.from({ length: 19 }, (_, i) =>
  rowWithGates(4 + i, verificationDemoPattern)
)
// '-' fails parseInt and becomes null - the fourth value class, .penaltyEmpty
// - at gate 1 (verified, left block) and gate 5 (plain, right block), so the
// empty background gets a verified/plain comparison too, not just 0/2/50.
const emptyDemoRow = rowWithGates(23, ['-', '2', '50', '0', '-', '2', '50', '0'])

const rows: C123ResultRow[] = [...glyphRows, ...verificationRows, emptyDemoRow]

// gates 1-4: verified. gates 5-8: plain, except one stale and one flagged
// cell (bib 6/gate 6, bib 7/gate 7) to show precedence holds against the new
// verified treatment. bibs 1-3 (the glyph-clipping fixture rows) stay plain
// throughout - untouched by this task's change in scope.
function getGateStatus(bib: string, gate: number): 'flagged' | 'stale' | 'verified' | 'plain' {
  const bibNum = Number(bib)
  if (bibNum < 4) return 'plain'
  if (bibNum === 6 && gate === 6) return 'stale'
  if (bibNum === 7 && gate === 7) return 'flagged'
  return gate <= 4 ? 'verified' : 'plain'
}

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
    getGateStatus={getGateStatus}
  />
)
