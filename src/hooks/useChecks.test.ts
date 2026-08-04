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
