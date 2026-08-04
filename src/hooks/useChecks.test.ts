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
})
