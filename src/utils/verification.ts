/**
 * Small, deliberately App-independent pieces of the penalty-verification
 * wiring (see App.tsx). Pulled out of the component so the two riskiest
 * rules - the write/verify ordering and the graceful-disable prop gating -
 * are unit-testable without rendering the whole app.
 */

import type { PenaltyValue } from '../types/scoring'

export interface SubmitPenaltyDeps {
  setGatePenalty: (bib: string, gate: number, value: PenaltyValue, raceId?: string) => Promise<boolean>
  verifyGate: (raceId: string, bib: string, gate: number, value: number | null) => Promise<boolean>
  checksAvailable: boolean
}

/**
 * Submit a penalty, then - if it lands and checks are available - verify the
 * gate against it (rule 4: the operator's own correction also verifies the
 * gate).
 *
 * Ordering is load-bearing, not stylistic: the server's invalidation hook
 * drops any existing check *during* the scoring write, so the check must be
 * set strictly after that write resolves - setting it first would just have
 * the write's own hook delete it again. Only for a value that exists, per
 * rule 3 (an empty gate is not verifiable).
 */
export async function submitPenaltyAndVerify(
  bib: string,
  gate: number,
  value: PenaltyValue,
  raceId: string | undefined,
  deps: SubmitPenaltyDeps
): Promise<void> {
  const ok = await deps.setGatePenalty(bib, gate, value, raceId)
  if (ok && value !== null && raceId && deps.checksAvailable) {
    await deps.verifyGate(raceId, bib, gate, value)
  }
}

/**
 * Graceful disable for an unsupported server: when checks are unavailable,
 * consumers (ResultsGrid, the race switcher) must receive none of the
 * verification callbacks - not callbacks that quietly no-op - so cells
 * render plain and the per-race indicator disappears instead of looking
 * like a broken feature. Returning `{}` rather than an object of
 * `undefined`s keeps `'prop' in element.props` truthful too.
 */
export function pickVerificationProps<T extends object>(available: boolean, props: T): Partial<T> {
  return available ? props : {}
}
