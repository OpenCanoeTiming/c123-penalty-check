/**
 * useChecks — verification state for the whole event.
 *
 * Loaded once from GET /api/checks and kept live by ChecksChanged /
 * FlagChanged events. Gate groups are a UI concept: the server stores per
 * gate and this hook aggregates.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchAllChecks, ChecksUnavailableError } from '../services/checksApi'
import { parseResultsGatesString } from '../utils'
import {
  createGateKey,
  EMPTY_RACE_CHECKS,
  type CheckChangedEvent,
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
  // Guards which load's response is allowed to touch state: bumped by a
  // newer load, by `enabled` toggling, and by an event (checks-reset,
  // checks-cleared) that must not be undone by a load already in flight.
  const loadToken = useRef(0)
  // Counts requests actually in flight, independent of `loadToken`. A load
  // whose response gets discarded via the token still completed a real
  // network round-trip, and `loading` must reflect that — otherwise
  // discarding a load right before it resolves leaves `loading` stuck true.
  const inFlightCount = useRef(0)

  const load = useCallback(async () => {
    if (!enabled) return
    const token = ++loadToken.current
    inFlightCount.current++
    setLoading(true)
    try {
      const data = await fetchAllChecks()
      if (token !== loadToken.current) return // superseded — see loadToken above
      setRaces(data.races ?? {})
      setAvailable(true)
      setUnavailableReason(null)
    } catch (error) {
      if (token !== loadToken.current) return
      // A server without the checks API is a supported configuration, not a
      // crash: the feature switches off and says so. Only fetchAllChecks can
      // raise ChecksUnavailableError — a 404 from the other endpoints means
      // "already gone" and must never disable the feature.
      if (error instanceof ChecksUnavailableError) {
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
      } else {
        // An ordinary failure (5xx, timeout, dropped connection) says
        // nothing about whether the checks API exists, so the feature stays
        // available — and whatever was already loaded stays on screen
        // rather than blanking every gate to `plain` mid-race.
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
      // unmounts: its response predates the transition and must not apply.
      // loadToken is a plain counter, not a DOM ref, so reading the latest
      // `.current` here (rather than a value captured at effect-setup time)
      // is exactly the intended behavior — not the stale-ref hazard the rule
      // guards against.
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
    if (event.event === 'checks-reset' || event.event === 'checks-cleared') {
      // A load already in flight when this event arrives carries a snapshot
      // from before it. Let it finish (inFlightCount still tracks it so
      // `loading` resolves correctly), but bump the token so its result is
      // ignored — otherwise a stale full reload would silently resurrect
      // what this event just discarded.
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
    }),
    [available, unavailableReason, loading, races, load, getStatus, getFlags, getRaceProgress, applyCheckEvent, applyFlagEvent]
  )
}

export type UseChecksReturn = ReturnType<typeof useChecks>
