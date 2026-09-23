/**
 * Penalty check types.
 *
 * Mirrors c123-server `src/checks/types.ts` (0.12.0+). Penalty values are
 * `number | null`, not PenaltyValue: team races carry cumulative values such
 * as 52/100/150 and the stored snapshot must survive them even though the UI
 * does not offer them yet.
 */

/** A verification of one gate. `value` is the snapshot at check time. */
export interface CheckEntry {
  checkedAt: string
  value: number | null
  tag?: string
}

/** A review request (podnět) on one gate. */
export interface FlagEntry {
  id: string
  bib: string
  gate: number
  createdAt: string
  comment: string
  suggestedValue?: number | null
  resolved: boolean
  resolvedAt?: string
  resolution?: string
}

/**
 * Checks and flags for one race. `checks` is keyed by `bib:gate`; `flags` is
 * a flat list — each entry already carries its own `bib` and `gate`.
 */
export interface RaceChecksData {
  checks: Record<string, CheckEntry>
  flags: FlagEntry[]
}

/** Response of GET /api/checks — the whole event in one payload. */
export interface AllChecksResponse {
  xmlFilename: string | null
  fingerprint: string | null
  races: Record<string, RaceChecksData>
}

export type CheckChangedEventName =
  | 'check-set'
  | 'check-removed'
  | 'check-invalidated'
  | 'checks-cleared'
  | 'checks-reset'

export interface CheckChangedEvent {
  event: CheckChangedEventName
  /** Empty string for 'checks-reset', which discards every race at once. */
  raceId: string
  bib?: string
  gate?: number
  check?: CheckEntry
}

export type FlagChangedEventName = 'flag-created' | 'flag-resolved' | 'flag-deleted'

export interface FlagChangedEvent {
  event: FlagChangedEventName
  raceId: string
  flag: FlagEntry
  /** Present when resolving created an auto-check. */
  check?: CheckEntry
  bib?: string
  gate?: number
}

/** Visual state of a gate cell, loudest first. */
export type GateCheckStatus = 'flagged' | 'stale' | 'verified' | 'plain'

/** Map key for a gate of a competitor. Must match the server's format. */
export function createGateKey(bib: string, gate: number): string {
  return `${bib}:${gate}`
}

// Frozen: consumers default an unknown race to this shared instance rather
// than allocating a new one, so `flags`/`checks` must never be mutated in
// place — a future `.push()` on what looked like "this race's flags" would
// silently corrupt the constant for every race that ever defaulted through
// it. Freezing turns that into an immediate TypeError instead. The nested
// objects are frozen in place (not just the container) so the mutable-looking
// `RaceChecksData` type can still describe it.
const emptyChecks: Record<string, CheckEntry> = {}
const emptyFlags: FlagEntry[] = []
Object.freeze(emptyChecks)
Object.freeze(emptyFlags)

export const EMPTY_RACE_CHECKS: RaceChecksData = Object.freeze({
  checks: emptyChecks,
  flags: emptyFlags,
})
