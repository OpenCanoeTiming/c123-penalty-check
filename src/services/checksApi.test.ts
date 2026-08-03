import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { fetchAllChecks, setCheck, removeCheck, createFlag, resolveFlag, deleteFlag } from './checksApi'
import { ApiRequestError } from './http'

vi.mock('./serverConfig', () => ({
  getApiBaseUrl: () => 'http://server:27123',
}))

function mockJson(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

describe('checksApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches all races in one call', async () => {
    vi.mocked(fetch).mockReturnValue(
      mockJson({ xmlFilename: 'e.xml', fingerprint: 'K1M@2026-08-03', races: {} })
    )

    const result = await fetchAllChecks()

    expect(fetch).toHaveBeenCalledWith(
      'http://server:27123/api/checks',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.xmlFilename).toBe('e.xml')
  })

  it('always sends an explicit value when setting a check', async () => {
    vi.mocked(fetch).mockReturnValue(
      mockJson({ success: true, check: { checkedAt: 'now', value: 2 } })
    )

    await setCheck('K1M_BR1', '42', 5, 2)

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://server:27123/api/checks/K1M_BR1/check')
    expect(options?.method).toBe('PUT')
    expect(JSON.parse(String(options?.body))).toEqual({ bib: '42', gate: 5, value: 2 })
  })

  it('sends value null explicitly rather than omitting it', async () => {
    vi.mocked(fetch).mockReturnValue(
      mockJson({ success: true, check: { checkedAt: 'now', value: null } })
    )

    await setCheck('K1M_BR1', '42', 5, null)

    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))
    expect(body).toHaveProperty('value', null)
  })

  it('url-encodes race ids', async () => {
    vi.mocked(fetch).mockReturnValue(mockJson({ success: true }))

    await removeCheck('K1M ST/BR1', '42', 5)

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      'http://server:27123/api/checks/K1M%20ST%2FBR1/check'
    )
  })

  it('creates a flag with comment and suggested value', async () => {
    vi.mocked(fetch).mockReturnValue(
      mockJson({ success: true, flag: { id: 'f1', bib: '42', gate: 7 } }, 201)
    )

    const flag = await createFlag('K1M_BR1', '42', 7, 'disputed', 50)

    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))
    expect(body).toEqual({ bib: '42', gate: 7, comment: 'disputed', suggestedValue: 50 })
    expect(flag.id).toBe('f1')
  })

  it('resolves a flag and returns the auto-created check', async () => {
    vi.mocked(fetch).mockReturnValue(
      mockJson({
        success: true,
        flag: { id: 'f1', bib: '42', gate: 7, resolved: true },
        check: { checkedAt: 'now', value: 50 },
      })
    )

    const result = await resolveFlag('K1M_BR1', 'f1', 'confirmed from video')

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://server:27123/api/checks/K1M_BR1/flag/f1')
    expect(options?.method).toBe('PATCH')
    expect(result.check?.value).toBe(50)
  })

  it('deletes a flag', async () => {
    // The server also returns the deleted flag ({ success, flag }); deleteFlag
    // discards it since the caller already knows the id it asked to delete.
    vi.mocked(fetch).mockReturnValue(
      mockJson({ success: true, flag: { id: 'f1', bib: '42', gate: 7 } })
    )

    await deleteFlag('K1M_BR1', 'f1')

    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe('DELETE')
  })

  it('surfaces a 404 as an unsupported ApiRequestError without retrying', async () => {
    vi.mocked(fetch).mockReturnValue(mockJson({ error: 'Not found' }, 404))

    await expect(fetchAllChecks()).rejects.toBeInstanceOf(ApiRequestError)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
