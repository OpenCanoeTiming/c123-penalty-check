import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChecks } from './useChecks'
import { ApiRequestError } from '../services/http'

// importActual keeps the real ChecksUnavailableError class — the hook does an
// `instanceof` against it, which a fully synthetic mock would break.
vi.mock('../services/checksApi', async (importActual) => {
  const actual = await importActual<typeof import('../services/checksApi')>()
  return {
    ...actual,
    fetchAllChecks: vi.fn(),
    setCheck: vi.fn(),
    removeCheck: vi.fn(),
    createFlag: vi.fn(),
    resolveFlag: vi.fn(),
    deleteFlag: vi.fn(),
  }
})
import * as api from '../services/checksApi'
import { ChecksUnavailableError } from '../services/checksApi'

const LOADED = {
  xmlFilename: 'e.xml',
  fingerprint: 'K1M_BR1@2026-08-03',
  races: {
    K1M_BR1: {
      checks: { '42:1': { checkedAt: 't', value: 2 } },
      flags: [{ id: 'f1', bib: '42', gate: 3, createdAt: 't', comment: 'c', resolved: false }],
    },
  },
}

async function renderLoaded() {
  vi.mocked(api.fetchAllChecks).mockResolvedValue(LOADED as never)
  const view = renderHook(() => useChecks({ enabled: true }))
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

describe('useChecks', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('loads the whole event once', async () => {
    const { result } = await renderLoaded()
    expect(api.fetchAllChecks).toHaveBeenCalledTimes(1)
    expect(result.current.available).toBe(true)
  })

  it('reports a verified gate whose value still matches', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('verified')
  })

  it('reports stale when the live value drifted from the snapshot', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getStatus('K1M_BR1', '42', 1, 50)).toBe('stale')
  })

  it('reports plain for an unchecked gate', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('plain')
  })

  it('lets an open flag win over every other state', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getStatus('K1M_BR1', '42', 3, 0)).toBe('flagged')
  })

  it('lets an open flag win over a check that still matches', async () => {
    // The fixture above never puts a check and an open flag on the same
    // gate, so it cannot tell "flag beats plain" from "flag beats verified".
    // This one does: gate 1 is checked with value 2 and the live value still
    // matches it, yet an open flag on the same gate must still win.
    const { result } = await renderLoaded()
    act(() => {
      result.current.applyFlagEvent({
        event: 'flag-created', raceId: 'K1M_BR1',
        flag: { id: 'f2', bib: '42', gate: 1, createdAt: 't', comment: 'c', resolved: false },
      })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('flagged')
  })

  it('ignores resolved flags when computing status', async () => {
    vi.mocked(api.fetchAllChecks).mockResolvedValue({
      ...LOADED,
      races: {
        K1M_BR1: {
          checks: {},
          flags: [{ id: 'f1', bib: '42', gate: 3, createdAt: 't', comment: 'c', resolved: true }],
        },
      },
    } as never)
    const { result } = renderHook(() => useChecks({ enabled: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.getStatus('K1M_BR1', '42', 3, 0)).toBe('plain')
  })

  it('counts progress over finished rows only', async () => {
    const { result } = await renderLoaded()
    const rows = [
      { bib: '42', gates: '2 0' },
      { bib: '43', gates: '0 0', status: 'DNF' },
    ]
    // bib 42 contributes 2 gates, one of them checked; bib 43 is excluded
    expect(result.current.getRaceProgress('K1M_BR1', rows)).toEqual({
      checked: 1,
      total: 2,
      done: false,
    })
  })

  it('does not misnumber gates across a deleted-penalty gap, and never reports a false "done"', async () => {
    // 6 real gates: 1=0, 2=2, 3 & 4 deleted (blank block in the fixed-width
    // string), 5=50, 6=0. Checks are recorded at real gates 1-4. A parser
    // that collapses whitespace instead of reading fixed 3-char blocks sees
    // only 4 positions here and numbers them 1-4 regardless of the gap — it
    // would report {checked: 4, total: 4, done: true}, a false "done" while
    // the real gates 5 and 6 were never touched.
    vi.mocked(api.fetchAllChecks).mockResolvedValue({
      ...LOADED,
      races: {
        K1M_BR1: {
          checks: {
            '42:1': { checkedAt: 't', value: 0 },
            '42:2': { checkedAt: 't', value: 2 },
            '42:3': { checkedAt: 't', value: null },
            '42:4': { checkedAt: 't', value: null },
          },
          flags: [],
        },
      },
    } as never)
    const { result } = renderHook(() => useChecks({ enabled: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const rows = [{ bib: '42', gates: '  0  2       50  0' }]
    expect(result.current.getRaceProgress('K1M_BR1', rows)).toEqual({
      checked: 4,
      total: 6,
      done: false,
    })
  })

  it('is done when every gate of every finished row is checked', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getRaceProgress('K1M_BR1', [{ bib: '42', gates: '2' }])).toEqual({
      checked: 1,
      total: 1,
      done: true,
    })
  })

  it('is not done when there is nothing to check yet', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getRaceProgress('K1M_BR1', []).done).toBe(false)
  })

  it('marks itself unavailable when the server has no checks API', async () => {
    // Constructor is (status, detail?) — the message is fixed by the class.
    vi.mocked(api.fetchAllChecks).mockRejectedValue(new ChecksUnavailableError(404))
    const { result } = renderHook(() => useChecks({ enabled: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.available).toBe(false)
  })

  it('stays available when the load fails for an ordinary reason', async () => {
    // A 500 or a dropped connection is not evidence that the server lacks the
    // checks API. Switching the feature off on any error would disable
    // verification mid-race on a transient blip.
    vi.mocked(api.fetchAllChecks).mockRejectedValue(new ApiRequestError('boom', 500))
    const { result } = renderHook(() => useChecks({ enabled: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.available).toBe(true)
  })

  it('keeps previously loaded verification state when a reload fails for an ordinary reason', async () => {
    // Staying "available" is not enough on its own: if a failed reload also
    // blanked every gate to `plain`, the operator would see verification
    // marks vanish mid-race with no error shown — the worst of both readings.
    const { result } = await renderLoaded()
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('verified')

    vi.mocked(api.fetchAllChecks).mockRejectedValueOnce(new ApiRequestError('boom', 500))
    await act(async () => {
      await result.current.reload()
    })

    expect(result.current.available).toBe(true)
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('verified')
  })

  it('discards an in-flight load when disabled before it resolves', async () => {
    let resolveLoad!: (value: typeof LOADED) => void
    const pending = new Promise<typeof LOADED>((resolve) => {
      resolveLoad = resolve
    })
    vi.mocked(api.fetchAllChecks).mockReturnValue(pending as never)

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useChecks({ enabled }),
      { initialProps: { enabled: true } }
    )
    expect(result.current.loading).toBe(true)

    rerender({ enabled: false })

    await act(async () => {
      resolveLoad(LOADED as never)
      await pending
    })

    // The response arrived after the feature was disabled — it must not
    // resurrect `available` from its initial `false`, and `loading` must not
    // get stuck true just because the response was discarded.
    expect(result.current.available).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it('applies check-set and check-invalidated events', async () => {
    const { result } = await renderLoaded()

    act(() => {
      result.current.applyCheckEvent({
        event: 'check-set', raceId: 'K1M_BR1', bib: '42', gate: 2,
        check: { checkedAt: 't', value: 0 },
      })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('verified')

    act(() => {
      result.current.applyCheckEvent({
        event: 'check-invalidated', raceId: 'K1M_BR1', bib: '42', gate: 2,
      })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('plain')
  })

  it('drops every race on checks-reset', async () => {
    const { result } = await renderLoaded()

    act(() => {
      result.current.applyCheckEvent({ event: 'checks-reset', raceId: '' })
    })

    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('plain')
    expect(result.current.getFlags('K1M_BR1', '42', 3)).toEqual([])
  })

  it('discards a reload response that predates a checks-reset that arrived while it was in flight', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('verified')

    let resolveReload!: (value: typeof LOADED) => void
    const pending = new Promise<typeof LOADED>((resolve) => {
      resolveReload = resolve
    })
    vi.mocked(api.fetchAllChecks).mockReturnValueOnce(pending as never)

    act(() => {
      void result.current.reload()
    })

    // The reset arrives while the reload above is still in flight.
    act(() => {
      result.current.applyCheckEvent({ event: 'checks-reset', raceId: '' })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('plain')

    // The reload's response, snapshotted before the reset, must not
    // resurrect what the reset just discarded.
    await act(async () => {
      resolveReload(LOADED as never)
      await pending
    })

    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('plain')
    expect(result.current.loading).toBe(false)
  })

  it('keeps a check-set event from another tablet after a reload response that predates it resolves (task 11 fix round 1, Minor-5)', async () => {
    // Same shape as the checks-reset test above, but for an ordinary
    // single-gate event: it must invalidate an in-flight load's snapshot
    // too, not just a full reset/clear - otherwise the newer check-set gets
    // silently overwritten a moment later by the older snapshot, and nothing
    // re-fetches to recover it (task 11 review, Minor-5). This pins Minor-5
    // only, not reconciliation-vs-discard in general: the fixture has a
    // single race, so a post-reload check on gate 1 (untouched by the event)
    // cannot distinguish "properly reconciled" from "response discarded but
    // gate 1 was already correct beforehand" - that distinction needs a
    // second race, which the test below this one provides.
    const { result } = await renderLoaded()
    expect(result.current.getStatus('K1M_BR1', '42', 5, 50)).toBe('plain')
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('verified')

    let resolveReload!: (value: typeof LOADED) => void
    const pending = new Promise<typeof LOADED>((resolve) => {
      resolveReload = resolve
    })
    vi.mocked(api.fetchAllChecks).mockReturnValueOnce(pending as never)

    act(() => {
      void result.current.reload()
    })

    // Another tablet verifies gate 5 while the reload above is still in
    // flight - the fetch was already on the wire when this happened, so its
    // snapshot cannot possibly include it.
    act(() => {
      result.current.applyCheckEvent({
        event: 'check-set', raceId: 'K1M_BR1', bib: '42', gate: 5,
        check: { checkedAt: 't2', value: 50 },
      })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 5, 50)).toBe('verified')

    // The reload's response, snapshotted before the check-set, must not
    // resurrect the pre-event (unverified) state on gate 5.
    await act(async () => {
      resolveReload(LOADED as never)
      await pending
    })

    expect(result.current.getStatus('K1M_BR1', '42', 5, 50)).toBe('verified')
    expect(result.current.loading).toBe(false)
  })

  it('keeps a flag-created event from another tablet after a reload response that predates it resolves (task 11 fix round 1, Minor-5)', async () => {
    // Same fix as above, exercised via applyFlagEvent instead of
    // applyCheckEvent. Also pins Minor-5 only, for the same single-race
    // reason given there.
    const { result } = await renderLoaded()
    const flag = { id: 'f9', bib: '42', gate: 8, createdAt: 't', comment: 'x', resolved: false }
    expect(result.current.getStatus('K1M_BR1', '42', 8, 0)).toBe('plain')
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('verified')

    let resolveReload!: (value: typeof LOADED) => void
    const pending = new Promise<typeof LOADED>((resolve) => {
      resolveReload = resolve
    })
    vi.mocked(api.fetchAllChecks).mockReturnValueOnce(pending as never)

    act(() => {
      void result.current.reload()
    })

    act(() => {
      result.current.applyFlagEvent({ event: 'flag-created', raceId: 'K1M_BR1', flag })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 8, 0)).toBe('flagged')

    await act(async () => {
      resolveReload(LOADED as never)
      await pending
    })

    expect(result.current.getStatus('K1M_BR1', '42', 8, 0)).toBe('flagged')
    expect(result.current.loading).toBe(false)
  })

  it('reconciles rather than discards when an unrelated event lands during the initial load, on a different race entirely (task 11 re-review, Important-A)', async () => {
    // The earlier fix (discard the whole response whenever eventToken
    // moved) traded Minor-5's one-gate loss for a bigger one: on the
    // *initial* load, `races` starts empty, so discarding meant losing every
    // race's verification state whenever an unrelated event raced in -
    // silently, since available/unavailableReason are gated by loadAttempt,
    // which no event touches.
    const snapshot = {
      xmlFilename: 'e.xml',
      fingerprint: 'f',
      races: {
        K1M_BR1: { checks: { '42:1': { checkedAt: 't', value: 2 } }, flags: [] },
        C1W_BR1: { checks: { '7:4': { checkedAt: 't', value: 50 } }, flags: [] },
      },
    }

    let resolveLoad!: (value: typeof snapshot) => void
    const pending = new Promise<typeof snapshot>((resolve) => {
      resolveLoad = resolve
    })
    vi.mocked(api.fetchAllChecks).mockReturnValue(pending as never)

    const { result } = renderHook(() => useChecks({ enabled: true }))
    expect(result.current.loading).toBe(true)

    // A third tablet verifies a gate on a *third* race - one the in-flight
    // fetch's eventual response will not even mention as "changed by this",
    // since the fetch was already on the wire.
    act(() => {
      result.current.applyCheckEvent({
        event: 'check-set', raceId: 'K1W_BR1', bib: '99', gate: 1,
        check: { checkedAt: 't2', value: 0 },
      })
    })
    expect(result.current.getStatus('K1W_BR1', '99', 1, 0)).toBe('verified')

    await act(async () => {
      resolveLoad(snapshot as never)
      await pending
    })

    // The fetched snapshot's own two races survived - not discarded.
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('verified')
    expect(result.current.getStatus('C1W_BR1', '7', 4, 50)).toBe('verified')
    // The unrelated event's own effect also survived - reconciled on top.
    expect(result.current.getStatus('K1W_BR1', '99', 1, 0)).toBe('verified')
    expect(result.current.available).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  it('does not let an unrelated single-gate event block a mutation\'s own rollback (loadToken stays scoped to reset/cleared)', async () => {
    // eventToken (Minor-5's fix) and loadToken (applyMutationResult/
    // rollbackMutation's guard) are deliberately two different counters.
    // Someone else verifying gate 3 must not stop *our* failed write to
    // gate 1 from rolling back - if it did, a wrong "verified" would stick
    // to gate 1 forever, since nothing else would ever correct it.
    const { result } = await renderLoaded()
    let rejectWrite!: (error: unknown) => void
    const pending = new Promise<never>((_resolve, reject) => {
      rejectWrite = reject
    })
    vi.mocked(api.setCheck).mockReturnValueOnce(pending as never)

    let verifyPromise!: Promise<boolean>
    act(() => {
      verifyPromise = result.current.verifyGate('K1M_BR1', '42', 2, 0)
    })
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('verified')

    // An unrelated event lands on a different gate while our write is still
    // in flight - this bumps eventToken but must not touch loadToken.
    act(() => {
      result.current.applyCheckEvent({
        event: 'check-set', raceId: 'K1M_BR1', bib: '42', gate: 3,
        check: { checkedAt: 't3', value: 2 },
      })
    })

    await act(async () => {
      rejectWrite(new ApiRequestError('boom', 500))
      await verifyPromise
    })

    // Our optimistic write to gate 2 rolled back, exactly as it would have
    // with no unrelated event at all.
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('plain')
  })

  it('keeps the availability verdict from the initial load even when a checks-reset supersedes it before it resolves', async () => {
    // Unlike a reload superseded by a *newer load*, the initial load here has
    // no successor to eventually provide its own verdict — the event only
    // invalidates the data snapshot, not the fact that the server answered.
    let resolveInitialLoad!: (value: typeof LOADED) => void
    const pending = new Promise<typeof LOADED>((resolve) => {
      resolveInitialLoad = resolve
    })
    vi.mocked(api.fetchAllChecks).mockReturnValue(pending as never)

    const { result } = renderHook(() => useChecks({ enabled: true }))
    expect(result.current.available).toBe(false) // nothing has resolved yet

    act(() => {
      result.current.applyCheckEvent({ event: 'checks-reset', raceId: '' })
    })

    await act(async () => {
      resolveInitialLoad(LOADED as never)
      await pending
    })

    // The response proves the server has a working checks API — that must
    // still count even though its data snapshot predates the reset.
    expect(result.current.available).toBe(true)
    expect(result.current.loading).toBe(false)
    // The reset is still honoured: the stale snapshot must not resurrect it.
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('plain')
  })

  it('still marks itself unavailable from the initial load\'s failure even when a checks-reset supersedes it first', async () => {
    // Same reasoning as the success case, applied to the error path: "the
    // server doesn't have this API" is a fact about the server, so an event
    // arriving first must not suppress it either.
    let rejectInitialLoad!: (error: unknown) => void
    const pending = new Promise<typeof LOADED>((_resolve, reject) => {
      rejectInitialLoad = reject
    })
    vi.mocked(api.fetchAllChecks).mockReturnValue(pending as never)

    const { result } = renderHook(() => useChecks({ enabled: true }))

    act(() => {
      result.current.applyCheckEvent({ event: 'checks-reset', raceId: '' })
    })

    await act(async () => {
      rejectInitialLoad(new ChecksUnavailableError(404))
      await pending.catch(() => {})
    })

    // `available` starting `false` is not enough to prove the verdict
    // applied — `unavailableReason` staying null is what "stuck at the
    // initial default" would look like.
    expect(result.current.available).toBe(false)
    expect(result.current.unavailableReason).not.toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('still applies the initial load\'s "stays available" verdict for an ordinary failure even when superseded by an event', async () => {
    // The default `available` starts false, so this is the case where a
    // failure to gate correctly would leave it stuck wrong rather than
    // coincidentally right.
    let rejectInitialLoad!: (error: unknown) => void
    const pending = new Promise<typeof LOADED>((_resolve, reject) => {
      rejectInitialLoad = reject
    })
    vi.mocked(api.fetchAllChecks).mockReturnValue(pending as never)

    const { result } = renderHook(() => useChecks({ enabled: true }))
    expect(result.current.available).toBe(false)

    act(() => {
      result.current.applyCheckEvent({ event: 'checks-reset', raceId: '' })
    })

    await act(async () => {
      rejectInitialLoad(new ApiRequestError('boom', 500))
      await pending.catch(() => {})
    })

    expect(result.current.available).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  it('clears a single race on checks-cleared', async () => {
    const { result } = await renderLoaded()

    act(() => {
      result.current.applyCheckEvent({ event: 'checks-cleared', raceId: 'K1M_BR1' })
    })

    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('plain')
  })

  it('adds and resolves flags from events', async () => {
    const { result } = await renderLoaded()
    const flag = { id: 'f9', bib: '42', gate: 8, createdAt: 't', comment: 'x', resolved: false }

    act(() => {
      result.current.applyFlagEvent({ event: 'flag-created', raceId: 'K1M_BR1', flag })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 8, 0)).toBe('flagged')

    act(() => {
      result.current.applyFlagEvent({
        event: 'flag-resolved',
        raceId: 'K1M_BR1',
        flag: { ...flag, resolved: true, resolvedAt: 't' },
        check: { checkedAt: 't', value: 0 },
      })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 8, 0)).toBe('verified')
  })

  it('does not let a stale success resurrect availability after a newer concurrent load already reported unavailable', async () => {
    // Two loads in flight at once: the initial mount load (attempt 1) and an
    // explicit reload (attempt 2). The newer one answers first with a 404 —
    // that verdict must stick even after the older one later succeeds.
    let resolveOlder!: (value: typeof LOADED) => void
    const older = new Promise<typeof LOADED>((resolve) => {
      resolveOlder = resolve
    })
    let rejectNewer!: (error: unknown) => void
    const newer = new Promise<typeof LOADED>((_resolve, reject) => {
      rejectNewer = reject
    })

    vi.mocked(api.fetchAllChecks)
      .mockReturnValueOnce(older as never) // initial load, attempt 1
      .mockReturnValueOnce(newer as never) // reload, attempt 2

    const { result } = renderHook(() => useChecks({ enabled: true }))

    act(() => {
      void result.current.reload()
    })

    await act(async () => {
      rejectNewer(new ChecksUnavailableError(404))
      await newer.catch(() => {})
    })
    expect(result.current.available).toBe(false)

    // The older attempt resolves successfully after the newer one already
    // reported unavailable — it must not resurrect availability.
    await act(async () => {
      resolveOlder(LOADED as never)
      await older
    })

    expect(result.current.available).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it('does not let a stale 404 wipe the checks loaded by a newer concurrent load', async () => {
    // Mirror of the above: the newer load (attempt 2) succeeds first and
    // populates checks, then the older load (attempt 1) fails with a 404.
    // The older failure must not wipe what the newer one just loaded.
    let rejectOlder!: (error: unknown) => void
    const older = new Promise<typeof LOADED>((_resolve, reject) => {
      rejectOlder = reject
    })
    let resolveNewer!: (value: typeof LOADED) => void
    const newer = new Promise<typeof LOADED>((resolve) => {
      resolveNewer = resolve
    })

    vi.mocked(api.fetchAllChecks)
      .mockReturnValueOnce(older as never) // initial load, attempt 1
      .mockReturnValueOnce(newer as never) // reload, attempt 2

    const { result } = renderHook(() => useChecks({ enabled: true }))

    act(() => {
      void result.current.reload()
    })

    await act(async () => {
      resolveNewer(LOADED as never)
      await newer
    })
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('verified')

    // The older attempt fails after the newer one already loaded — it must
    // not wipe the newer data or flip availability off.
    await act(async () => {
      rejectOlder(new ChecksUnavailableError(404))
      await older.catch(() => {})
    })

    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('verified')
    expect(result.current.available).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  it('does not let a stale ordinary failure re-enable the feature a newer 404 already disabled', async () => {
    // Third concurrent-load scenario, mirroring the two above: the newer
    // load (attempt 2) answers first with a 404, switching the feature off.
    // The older load (attempt 1) then fails for an ordinary reason (a 500) —
    // that must not flip availability back on against a server that has no
    // checks API at all.
    let rejectOlder!: (e: unknown) => void
    const older = new Promise<typeof LOADED>((_resolve, reject) => {
      rejectOlder = reject
    })
    let rejectNewer!: (e: unknown) => void
    const newer = new Promise<typeof LOADED>((_resolve, reject) => {
      rejectNewer = reject
    })

    vi.mocked(api.fetchAllChecks)
      .mockReturnValueOnce(older as never) // initial load, attempt 1
      .mockReturnValueOnce(newer as never) // reload, attempt 2

    const { result } = renderHook(() => useChecks({ enabled: true }))
    act(() => {
      void result.current.reload()
    })

    await act(async () => {
      rejectNewer(new ChecksUnavailableError(404))
      await newer.catch(() => {})
    })
    expect(result.current.available).toBe(false)

    // The older attempt then fails with an ordinary 500 — it must not
    // re-enable a feature the newer attempt proved is absent.
    await act(async () => {
      rejectOlder(new ApiRequestError('boom', 500))
      await older.catch(() => {})
    })

    expect(result.current.available).toBe(false)
    expect(result.current.unavailableReason).not.toBeNull()
    expect(result.current.loading).toBe(false)
  })
})

describe('useChecks mutations', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('verifies a gate optimistically and sends the explicit value', async () => {
    const { result } = await renderLoaded()
    vi.mocked(api.setCheck).mockResolvedValue({ checkedAt: 't', value: 0 })

    await act(async () => {
      await result.current.verifyGate('K1M_BR1', '42', 2, 0)
    })

    expect(api.setCheck).toHaveBeenCalledWith('K1M_BR1', '42', 2, 0)
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('verified')
  })

  it('rolls back when the write fails', async () => {
    const { result } = await renderLoaded()
    vi.mocked(api.setCheck).mockRejectedValue(new ApiRequestError('boom', 500))

    await act(async () => {
      await result.current.verifyGate('K1M_BR1', '42', 2, 0)
    })

    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('plain')
  })

  it('refuses to verify an empty gate', async () => {
    const { result } = await renderLoaded()

    let outcome = true
    await act(async () => {
      outcome = await result.current.verifyGate('K1M_BR1', '42', 9, null)
    })

    expect(outcome).toBe(false)
    expect(api.setCheck).not.toHaveBeenCalled()
  })

  it('toggles a verified gate back to plain', async () => {
    const { result } = await renderLoaded()
    vi.mocked(api.removeCheck).mockResolvedValue(undefined)

    await act(async () => {
      await result.current.toggleGate('K1M_BR1', '42', 1, 2)
    })

    expect(api.removeCheck).toHaveBeenCalledWith('K1M_BR1', '42', 1)
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('plain')
  })

  it('verifies a section, skipping the empty gate and reporting it', async () => {
    const { result } = await renderLoaded()
    vi.mocked(api.setCheck).mockImplementation(
      async (_r, _b, _g, value) => ({ checkedAt: 't', value: value as number })
    )

    let outcome!: { verified: number[]; firstEmpty: number | null }
    await act(async () => {
      outcome = await result.current.verifySection(
        'K1M_BR1', '42', [4, 5, 6],
        new Map([[4, 0], [5, null], [6, 2]])
      )
    })

    expect(outcome).toEqual({ verified: [4, 6], firstEmpty: 5 })
    expect(api.setCheck).toHaveBeenCalledTimes(2)
    expect(result.current.getStatus('K1M_BR1', '42', 5, null)).toBe('plain')
  })

  it('keeps the gates that succeeded when one write in a section fails', async () => {
    const { result } = await renderLoaded()
    vi.mocked(api.setCheck)
      .mockResolvedValueOnce({ checkedAt: 't', value: 0 })
      .mockRejectedValueOnce(new ApiRequestError('boom', 500))

    await act(async () => {
      await result.current.verifySection(
        'K1M_BR1', '42', [4, 6], new Map([[4, 0], [6, 2]])
      )
    })

    expect(result.current.getStatus('K1M_BR1', '42', 4, 0)).toBe('verified')
    expect(result.current.getStatus('K1M_BR1', '42', 6, 2)).toBe('plain')
  })

  it('toggles a plain gate to verified', async () => {
    // Mirror of "toggles a verified gate back to plain" — the un-verify
    // direction had a test, the verify direction (the most common tap in the
    // app) did not.
    const { result } = await renderLoaded()
    vi.mocked(api.setCheck).mockResolvedValue({ checkedAt: 't', value: 0 })

    await act(async () => {
      await result.current.toggleGate('K1M_BR1', '42', 2, 0)
    })

    expect(api.setCheck).toHaveBeenCalledWith('K1M_BR1', '42', 2, 0)
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('verified')
  })

  it('shows the gate as verified immediately, before the write settles', async () => {
    // The whole point of "optimistic": the grid must update on tap, not on
    // ack. Every other test awaits the settled promise before reading
    // status, so none of them can tell an optimistic write from one that
    // waits for the round trip — this one reads status while the request is
    // still open.
    const { result } = await renderLoaded()
    let resolveWrite!: (value: { checkedAt: string; value: number }) => void
    const pending = new Promise<{ checkedAt: string; value: number }>((resolve) => {
      resolveWrite = resolve
    })
    vi.mocked(api.setCheck).mockReturnValueOnce(pending as never)

    let verifyPromise!: Promise<boolean>
    act(() => {
      verifyPromise = result.current.verifyGate('K1M_BR1', '42', 2, 0)
    })

    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('verified')

    await act(async () => {
      resolveWrite({ checkedAt: 't', value: 0 })
      await verifyPromise
    })

    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('verified')
  })

  it('does not resurrect a check that a concurrent event deleted when the write later fails', async () => {
    // Gate 1 starts verified at value 2 (fixture). The judge re-verifies
    // against a drifted live value while, on another tablet, someone
    // un-verifies the same gate — the check-removed event lands before our
    // write fails.
    const { result } = await renderLoaded()
    let rejectWrite!: (error: unknown) => void
    const pending = new Promise<never>((_resolve, reject) => {
      rejectWrite = reject
    })
    vi.mocked(api.setCheck).mockReturnValueOnce(pending as never)

    let verifyPromise!: Promise<boolean>
    act(() => {
      verifyPromise = result.current.verifyGate('K1M_BR1', '42', 1, 50)
    })

    act(() => {
      result.current.applyCheckEvent({
        event: 'check-removed', raceId: 'K1M_BR1', bib: '42', gate: 1,
      })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 1, 50)).toBe('plain')

    // Our write fails after the concurrent delete — it must not resurrect
    // the check the event already removed.
    await act(async () => {
      rejectWrite(new ApiRequestError('boom', 500))
      await verifyPromise
    })

    expect(result.current.getStatus('K1M_BR1', '42', 1, 50)).toBe('plain')
  })

  it('does not clobber a concurrent check-set when a failed unverify tries to restore the old value', async () => {
    // Mirror of the above for unverifyGate's rollback. Gate 1 starts
    // verified at value 2; while our removal is in flight, another tablet
    // re-verifies the same gate at a new value (5) — our failed removal must
    // not restore the stale value 2 over it.
    const { result } = await renderLoaded()
    let rejectRemove!: (error: unknown) => void
    const pending = new Promise<never>((_resolve, reject) => {
      rejectRemove = reject
    })
    vi.mocked(api.removeCheck).mockReturnValueOnce(pending as never)

    let unverifyPromise!: Promise<boolean>
    act(() => {
      unverifyPromise = result.current.unverifyGate('K1M_BR1', '42', 1)
    })

    act(() => {
      result.current.applyCheckEvent({
        event: 'check-set', raceId: 'K1M_BR1', bib: '42', gate: 1,
        check: { checkedAt: 't2', value: 5 },
      })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 1, 5)).toBe('verified')

    await act(async () => {
      rejectRemove(new ApiRequestError('boom', 500))
      await unverifyPromise
    })

    expect(result.current.getStatus('K1M_BR1', '42', 1, 5)).toBe('verified')
  })

  it('does not let a successful write resurrect a race that checks-reset already discarded', async () => {
    // The operator loads a new XML mid-write: the server broadcasts
    // checks-reset while our verify is still in flight. The write later
    // succeeds — it must not re-create the race the reset just discarded.
    const { result } = await renderLoaded()
    let resolveWrite!: (value: { checkedAt: string; value: number }) => void
    const pending = new Promise<{ checkedAt: string; value: number }>((resolve) => {
      resolveWrite = resolve
    })
    vi.mocked(api.setCheck).mockReturnValueOnce(pending as never)

    let verifyPromise!: Promise<boolean>
    act(() => {
      verifyPromise = result.current.verifyGate('K1M_BR1', '42', 2, 0)
    })

    act(() => {
      result.current.applyCheckEvent({ event: 'checks-reset', raceId: '' })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('plain')

    await act(async () => {
      resolveWrite({ checkedAt: 't', value: 0 })
      await verifyPromise
    })

    expect(result.current.races['K1M_BR1']).toBeUndefined()
  })

  it('does not let a failed write\'s rollback resurrect a race that checks-reset already discarded', async () => {
    // Mirror of the above via the rollback path instead of the success path
    // — the fix guards both, per the same loadToken reasoning as load().
    const { result } = await renderLoaded()
    let rejectWrite!: (error: unknown) => void
    const pending = new Promise<never>((_resolve, reject) => {
      rejectWrite = reject
    })
    vi.mocked(api.setCheck).mockReturnValueOnce(pending as never)

    let verifyPromise!: Promise<boolean>
    act(() => {
      verifyPromise = result.current.verifyGate('K1M_BR1', '42', 2, 0)
    })

    act(() => {
      result.current.applyCheckEvent({ event: 'checks-reset', raceId: '' })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('plain')

    await act(async () => {
      rejectWrite(new ApiRequestError('boom', 500))
      await verifyPromise
    })

    expect(result.current.races['K1M_BR1']).toBeUndefined()
  })

  it('does not let a failed write\'s rollback race ahead of a newer load already in flight', async () => {
    // A second load (e.g. an explicit reload) starts and bumps loadToken
    // while our write is still in flight, before anything has touched the
    // key our optimistic write set. The rollback must defer to the newer
    // load rather than restoring `previous` right as a fresher snapshot is
    // about to supersede it — the same reordering reasoning as load() itself.
    const { result } = await renderLoaded()

    let rejectWrite!: (error: unknown) => void
    const writePending = new Promise<never>((_resolve, reject) => {
      rejectWrite = reject
    })
    vi.mocked(api.setCheck).mockReturnValueOnce(writePending as never)

    let verifyPromise!: Promise<boolean>
    act(() => {
      verifyPromise = result.current.verifyGate('K1M_BR1', '42', 2, 0)
    })
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('verified')

    // A newer load starts — and is itself still in flight — before our write
    // settles.
    const reloadPending = new Promise<typeof LOADED>(() => {
      // Deliberately never resolved: this test only needs the newer load to
      // have started (bumping loadToken), not to complete.
    })
    vi.mocked(api.fetchAllChecks).mockReturnValueOnce(reloadPending as never)
    act(() => {
      void result.current.reload()
    })

    // Our write now fails. Nothing else has touched the key yet, so a naive
    // rollback would restore `previous` — but a newer load is already in
    // flight and will decide the final state, so the rollback must not act.
    await act(async () => {
      rejectWrite(new ApiRequestError('boom', 500))
      await verifyPromise
    })

    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('verified')
  })
})
