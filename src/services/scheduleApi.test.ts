import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchScheduleDates } from './scheduleApi'

describe('fetchScheduleDates', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns raceId-to-date map from REST schedule', async () => {
    const mockResponse = {
      schedule: [
        { raceId: 'K1M_BR1_18', startTime: '2026-04-18T08:30:00+02:00', raceStatus: 5 },
        { raceId: 'K1M_BR1_19', startTime: '2026-04-19T08:40:00+02:00', raceStatus: 1 },
      ],
    }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await fetchScheduleDates('http://localhost:27123')
    expect(result.get('K1M_BR1_18')).toBe('2026-04-18')
    expect(result.get('K1M_BR1_19')).toBe('2026-04-19')
  })

  it('returns empty map on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    const result = await fetchScheduleDates('http://localhost:27123')
    expect(result.size).toBe(0)
  })

  it('returns empty map on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    const result = await fetchScheduleDates('http://localhost:27123')
    expect(result.size).toBe(0)
  })

  it('handles missing or invalid startTime gracefully', async () => {
    const mockResponse = {
      schedule: [
        { raceId: 'K1M_BR1_18', startTime: '2026-04-18T08:30:00+02:00' },
        { raceId: 'K1M_BR1_19', startTime: undefined },
        { raceId: 'K1M_BR2_19', startTime: 'not-a-date' },
      ],
    }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await fetchScheduleDates('http://localhost:27123')
    expect(result.get('K1M_BR1_18')).toBe('2026-04-18')
    expect(result.has('K1M_BR1_19')).toBe(false)
    expect(result.has('K1M_BR2_19')).toBe(false)
  })
})
