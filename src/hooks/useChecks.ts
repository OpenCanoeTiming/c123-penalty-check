/**
 * useChecks — verification state for the whole event.
 *
 * Loaded once from GET /api/checks and kept live by ChecksChanged /
 * FlagChanged events. Gate groups are a UI concept: the server stores per
 * gate and this hook aggregates.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchAllChecks, setCheck, removeCheck, ChecksUnavailableError } from '../services/checksApi'
import { parseResultsGatesString } from '../utils'
import {
  createGateKey,
  EMPTY_RACE_CHECKS,
  type CheckChangedEvent,
  type CheckEntry,
  type FlagChangedEvent,
  type FlagEntry,
  type GateCheckStatus,
  type RaceChecksData,
} from '../types/checks'

export interface ProgressRow {
  bib: string
  gates: string
  status?: string
}

export interface RaceProgress {
  checked: number
  total: number
  done: boolean
}

type RacesState = Record<string, RaceChecksData>

export function useChecks(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options

  const [races, setRaces] = useState<RacesState>({})
  const [available, setAvailable] = useState(false)
  const [unavailableReason, setUnavailableReason] =
    useState<{ status: number; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  // Two independent guards, deliberately not one:
  //
  // - loadAttempt answers "has a *newer load* been started since?" It is
  //   bumped only by `load()` itself and by disabling/unmounting. A
  //   response's availability verdict (available / unavailableReason) is
  //   true about the server regardless of what a WebSocket event did to the
  //   data meanwhile, so the verdict is gated by this alone — an event must
  //   never suppress it. Gating it by anything an event touches also broke
  //   reordering: without a token dedicated to "newer load exists", a slow
  //   response from an old attempt could overwrite a faster newer one that
  //   already resolved.
  // - loadToken answers "is this response's *data* still current?" It is
  //   bumped by everything loadAttempt is, plus checks-reset/checks-cleared
  //   events, since those events make an in-flight snapshot stale without
  //   starting a new load. Only the races snapshot is gated by this. It is
  //   deliberately NOT bumped by an ordinary single-gate event (check-set,
  //   flag-created, ...): applyMutationResult/rollbackMutation also gate on
  //   this same token to decide whether *their own* request's result is
  //   still safe to apply, and that guard must survive an unrelated
  //   concurrent event elsewhere in the event (see their own comments) - a
  //   failed write whose rollback got skipped because someone else verified
  //   a different gate would leave a wrong optimistic entry stuck forever,
  //   with nothing left to correct it.
  const loadAttempt = useRef(0)
  const loadToken = useRef(0)
  // Answers a narrower question than loadToken: "has *any* check/flag event
  // been applied since this load started?" Bumped by every applied event,
  // check or flag, reset/cleared included - unlike loadToken, an ordinary
  // single-gate event counts too. load() snapshots this alongside loadToken
  // and refuses to apply its response if either moved: a check-set that
  // arrives while a load's fetch is in flight is strictly newer than that
  // fetch's snapshot, so applying the snapshot afterwards would silently
  // overwrite the event's own update - and nothing would re-fetch to
  // recover it. Not reused by applyMutationResult/rollbackMutation - see
  // loadToken's comment for why those two must stay unaffected by an
  // unrelated single-gate event.
  const eventToken = useRef(0)
  // Counts requests actually in flight, independent of either token above. A
  // load whose response gets discarded still completed a real network
  // round-trip, and `loading` must reflect that — otherwise discarding a
  // load right before it resolves leaves `loading` stuck true.
  const inFlightCount = useRef(0)

  const load = useCallback(async () => {
    if (!enabled) return
    const attempt = ++loadAttempt.current
    const token = ++loadToken.current
    const eventsSeen = eventToken.current
    inFlightCount.current++
    setLoading(true)
    try {
      const data = await fetchAllChecks()
      // A successful response proves the server has a working checks API
      // right now — true regardless of whether a reset/cleared event
      // invalidated this attempt's data snapshot while it was in flight.
      // Only a strictly newer load attempt should suppress this verdict.
      if (attempt === loadAttempt.current) {
        setAvailable(true)
        setUnavailableReason(null)
      }
      if (token !== loadToken.current) return // stale snapshot: verdict kept above, data dropped here
      // Same idea, narrower trigger: an ordinary single-gate event (not just
      // reset/cleared) landed while this fetch was in flight, so the fetch's
      // snapshot predates it and must not overwrite it.
      if (eventsSeen !== eventToken.current) return
      setRaces(data.races ?? {})
    } catch (error) {
      // A server without the checks API is a supported configuration, not a
      // crash: the feature switches off and says so. Only fetchAllChecks can
      // raise ChecksUnavailableError — a 404 from the other endpoints means
      // "already gone" and must never disable the feature.
      if (error instanceof ChecksUnavailableError) {
        // Same reasoning as the success path: "the server doesn't have this
        // API" is a fact about the server, not about any one event, so it is
        // gated the same way — only a newer load attempt suppresses it. The
        // data-clear travels with the verdict here (there is no "stale but
        // valid" data when the whole endpoint is unavailable), so it uses
        // the same gate rather than loadToken.
        if (attempt === loadAttempt.current) {
          setRaces({})
          setAvailable(false)
          // 404 and 503 mean different things to the operator: upgrade the
          // server, versus load an XML file into the one already running.
          // `detail` carries the server's own text; the class message is the
          // generic fallback.
          setUnavailableReason({
            status: error.status,
            message: error.detail ?? error.message,
          })
        }
      } else if (attempt === loadAttempt.current) {
        // An ordinary failure (5xx, timeout, dropped connection) says
        // nothing about whether the checks API exists, so the feature stays
        // available — and whatever was already loaded stays on screen
        // rather than blanking every gate to `plain` mid-race. Gated the
        // same way: a newer load attempt's verdict must win, not this one.
        setAvailable(true)
        setUnavailableReason(null)
      }
    } finally {
      inFlightCount.current--
      if (inFlightCount.current === 0) setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void load()
    return () => {
      // Discard whatever load is still in flight when `enabled` flips (this
      // effect reruns because `load`'s identity changed) or the hook
      // unmounts: its response predates the transition and must not apply —
      // to its verdict or its data, so both tokens are bumped. These are
      // plain counters, not DOM refs, so reading the latest `.current` here
      // (rather than a value captured at effect-setup time) is exactly the
      // intended behavior — not the stale-ref hazard the rule guards against.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      loadAttempt.current++
      // eslint-disable-next-line react-hooks/exhaustive-deps
      loadToken.current++
    }
  }, [load])

  const getFlags = useCallback(
    (raceId: string, bib: string, gate: number): FlagEntry[] =>
      (races[raceId]?.flags ?? []).filter((flag) => flag.bib === bib && flag.gate === gate),
    [races]
  )

  const getStatus = useCallback(
    (raceId: string, bib: string, gate: number, liveValue: number | null): GateCheckStatus => {
      const key = createGateKey(bib, gate)
      const race = races[raceId] ?? EMPTY_RACE_CHECKS

      // The server stores flags as a flat array — each entry carries its own
      // bib and gate, so there is no key to index by.
      const hasOpenFlag = (race.flags ?? []).some(
        (flag) => !flag.resolved && flag.bib === bib && flag.gate === gate
      )
      if (hasOpenFlag) return 'flagged'

      const check = race.checks?.[key]
      if (!check) return 'plain'

      // A verification is only worth anything while the value it was taken
      // against still holds. Changes made directly in Canoe123 never reach the
      // server's invalidation hook, so this comparison is the only guard.
      return check.value === liveValue ? 'verified' : 'stale'
    },
    [races]
  )

  const getRaceProgress = useCallback(
    (raceId: string, rows: ProgressRow[]): RaceProgress => {
      const race = races[raceId] ?? EMPTY_RACE_CHECKS
      let checked = 0
      let total = 0

      for (const row of rows) {
        if (row.status) continue // rule 7: finished runs without a status only
        // Fixed-width C123 gates strings leave a blank block for a deleted
        // penalty — parseResultsGatesString preserves that position as null
        // rather than collapsing it, so gate numbering here stays aligned
        // with the real gate numbers the server keys checks by. A race with
        // an unverifiable (null) gate counts it in `total` and never in
        // `checked`, so it can never read as done.
        const values = parseResultsGatesString(row.gates)
        for (let index = 0; index < values.length; index++) {
          total++
          if (race.checks?.[createGateKey(row.bib, index + 1)]) checked++
        }
      }

      return { checked, total, done: total > 0 && checked === total }
    },
    [races]
  )

  const applyCheckEvent = useCallback((event: CheckChangedEvent) => {
    // Every applied event bumps eventToken, so a load() already in flight
    // (its snapshot necessarily predates this event) discards its response
    // rather than overwriting what this event is about to write - see the
    // comment above `eventToken`'s declaration. checks-reset/checks-cleared
    // additionally bump loadToken, which also invalidates
    // applyMutationResult/rollbackMutation's in-flight mutations for this
    // race - an ordinary single-gate event deliberately does not do that
    // (see loadToken's comment). loadAttempt is left alone either way: the
    // response is still real information about whether the server has a
    // working checks API, which no applied event says anything about — see
    // the comment above `loadAttempt`'s declaration.
    eventToken.current++
    if (event.event === 'checks-reset' || event.event === 'checks-cleared') {
      loadToken.current++
    }

    setRaces((prev) => {
      if (event.event === 'checks-reset') return {}

      const race = prev[event.raceId] ?? EMPTY_RACE_CHECKS

      if (event.event === 'checks-cleared') {
        return { ...prev, [event.raceId]: { checks: {}, flags: [] } }
      }

      if (event.bib === undefined || event.gate === undefined) return prev
      const key = createGateKey(event.bib, event.gate)
      const checks = { ...race.checks }

      if (event.event === 'check-set' && event.check) {
        checks[key] = event.check
      } else {
        delete checks[key]
      }

      return { ...prev, [event.raceId]: { checks, flags: race.flags ?? [] } }
    })
  }, [])

  const applyFlagEvent = useCallback((event: FlagChangedEvent) => {
    // Same reasoning as applyCheckEvent's eventToken bump: a
    // flag-created/-resolved/-deleted is strictly newer than a load()
    // response requested before it, so that response's snapshot must not be
    // allowed to silently overwrite what this event just wrote. Flag events
    // never wipe a whole race the way checks-reset/-cleared do, so loadToken
    // itself is untouched here - see loadToken's comment.
    eventToken.current++

    setRaces((prev) => {
      const race = prev[event.raceId] ?? EMPTY_RACE_CHECKS
      const existing = race.flags ?? []

      let flags: FlagEntry[]
      if (event.event === 'flag-deleted') {
        flags = existing.filter((flag) => flag.id !== event.flag.id)
      } else if (existing.some((flag) => flag.id === event.flag.id)) {
        flags = existing.map((flag) => (flag.id === event.flag.id ? event.flag : flag))
      } else {
        flags = [...existing, event.flag]
      }

      const checks = { ...race.checks }
      if (event.check) checks[createGateKey(event.flag.bib, event.flag.gate)] = event.check

      return { ...prev, [event.raceId]: { checks, flags } }
    })
  }, [])

  const writeCheckLocally = useCallback(
    (raceId: string, bib: string, gate: number, check: CheckEntry | null) => {
      setRaces((prev) => {
        const race = prev[raceId] ?? EMPTY_RACE_CHECKS
        const checks = { ...race.checks }
        const key = createGateKey(bib, gate)
        if (check) checks[key] = check
        else delete checks[key]
        return { ...prev, [raceId]: { checks, flags: race.flags ?? [] } }
      })
    },
    []
  )

  // Applies a mutation's server-confirmed result. Guarded only by `token`
  // (captured from loadToken before the request went out): a checks-reset/
  // -cleared that arrived while the request was in flight already discarded
  // this race's context entirely (the operator loaded a new XML), and the
  // response — even a successful one — must not resurrect it. Unlike the
  // rollback below, this is deliberately NOT guarded by an identity check
  // against a concurrent single-gate event: the REST response is direct
  // confirmation of what *this specific request* achieved, which outranks
  // whatever a same-key WS event did to the local snapshot meanwhile.
  const applyMutationResult = useCallback(
    (raceId: string, bib: string, gate: number, token: number, check: CheckEntry | null) => {
      if (loadToken.current !== token) return
      writeCheckLocally(raceId, bib, gate, check)
    },
    [writeCheckLocally]
  )

  // Restores `previous` after a failed write, guarded two ways:
  //
  // - `token`: same reasoning as applyMutationResult — a checks-reset/
  //   -cleared since the request started means this race is gone; resurrecting
  //   it from a failed request's rollback would be just as wrong as from a
  //   successful one.
  // - `expected` (compared by reference, not value): the optimistic entry
  //   this call itself wrote, or `undefined` for an optimistic delete
  //   (unverifyGate). Restoring is only safe if the entry is still exactly
  //   what we left it as — if a concurrent single-gate event (another
  //   tablet's check-removed/-invalidated/-set) already changed it, that
  //   change is real server state and blindly overwriting it with our stale
  //   `previous` would resurrect something the event legitimately
  //   superseded.
  const rollbackMutation = useCallback(
    (
      raceId: string,
      bib: string,
      gate: number,
      token: number,
      expected: CheckEntry | undefined,
      previous: CheckEntry | null
    ) => {
      if (loadToken.current !== token) return
      const key = createGateKey(bib, gate)
      setRaces((prev) => {
        const race = prev[raceId] ?? EMPTY_RACE_CHECKS
        if (race.checks?.[key] !== expected) return prev
        const checks = { ...race.checks }
        if (previous) checks[key] = previous
        else delete checks[key]
        return { ...prev, [raceId]: { checks, flags: race.flags ?? [] } }
      })
    },
    []
  )

  const verifyGate = useCallback(
    async (raceId: string, bib: string, gate: number, liveValue: number | null): Promise<boolean> => {
      // Rule 3: an empty gate carries nothing to verify against the paper.
      if (liveValue === null) return false

      const key = createGateKey(bib, gate)
      const previous = races[raceId]?.checks?.[key] ?? null
      const token = loadToken.current
      const optimistic: CheckEntry = { checkedAt: new Date().toISOString(), value: liveValue }
      writeCheckLocally(raceId, bib, gate, optimistic)

      try {
        const check = await setCheck(raceId, bib, gate, liveValue)
        applyMutationResult(raceId, bib, gate, token, check)
        return true
      } catch {
        rollbackMutation(raceId, bib, gate, token, optimistic, previous)
        return false
      }
    },
    [races, writeCheckLocally, applyMutationResult, rollbackMutation]
  )

  const unverifyGate = useCallback(
    async (raceId: string, bib: string, gate: number): Promise<boolean> => {
      const key = createGateKey(bib, gate)
      const previous = races[raceId]?.checks?.[key] ?? null
      const token = loadToken.current
      writeCheckLocally(raceId, bib, gate, null)

      try {
        await removeCheck(raceId, bib, gate)
        return true
      } catch {
        rollbackMutation(raceId, bib, gate, token, undefined, previous)
        return false
      }
    },
    [races, writeCheckLocally, rollbackMutation]
  )

  const toggleGate = useCallback(
    (raceId: string, bib: string, gate: number, liveValue: number | null): Promise<boolean> => {
      const check = races[raceId]?.checks?.[createGateKey(bib, gate)]
      return check ? unverifyGate(raceId, bib, gate) : verifyGate(raceId, bib, gate, liveValue)
    },
    [races, verifyGate, unverifyGate]
  )

  const verifySection = useCallback(
    async (
      raceId: string,
      bib: string,
      gates: number[],
      liveValues: Map<number, number | null>
    ): Promise<{ verified: number[]; firstEmpty: number | null }> => {
      let firstEmpty: number | null = null
      const candidates: number[] = []

      for (const gate of gates) {
        const value = liveValues.get(gate) ?? null
        if (value === null) {
          if (firstEmpty === null) firstEmpty = gate
          continue
        }
        candidates.push(gate)
      }

      // One request per gate: batch writes are out of scope by decision, and
      // a partial section simply reads as incomplete.
      const outcomes = await Promise.all(
        candidates.map((gate) => verifyGate(raceId, bib, gate, liveValues.get(gate) ?? null))
      )

      return {
        verified: candidates.filter((_, index) => outcomes[index]),
        firstEmpty,
      }
    },
    [verifyGate]
  )

  return useMemo(
    () => ({
      available,
      unavailableReason,
      loading,
      races,
      reload: load,
      getStatus,
      getFlags,
      getRaceProgress,
      applyCheckEvent,
      applyFlagEvent,
      verifyGate,
      unverifyGate,
      toggleGate,
      verifySection,
    }),
    [
      available,
      unavailableReason,
      loading,
      races,
      load,
      getStatus,
      getFlags,
      getRaceProgress,
      applyCheckEvent,
      applyFlagEvent,
      verifyGate,
      unverifyGate,
      toggleGate,
      verifySection,
    ]
  )
}

export type UseChecksReturn = ReturnType<typeof useChecks>
