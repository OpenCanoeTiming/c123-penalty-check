import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchRaceResults } from './resultsApi'

describe('fetchRaceResults', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('transforms REST results to C123ResultsData format', async () => {
    const mockResponse = {
      results: [
        {
          raceId: 'K1M_BR1_18',
          id: '12054.K1M',
          startOrder: 1,
          bib: '1',
          startTime: '08:30:00',
          status: '',
          time: 7899,
          pen: 2,
          total: 8099,
          rank: 1,
          gates: '  0  0  2  0  0  0',
          participant: {
            id: '12054.K1M',
            classId: 'K1M',
            bib: '1',
            familyName: 'NOVAK',
            givenName: 'Jan',
            club: 'TJ Test',
            isTeam: false,
          },
        },
      ],
    }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await fetchRaceResults('K1M_BR1_18', 'http://localhost:27123')
    expect(result).not.toBeNull()
    expect(result!.raceId).toBe('K1M_BR1_18')
    expect(result!.rows).toHaveLength(1)

    const row = result!.rows[0]
    expect(row.name).toBe('NOVAK Jan')
    expect(row.familyName).toBe('NOVAK')
    expect(row.givenName).toBe('Jan')
    expect(row.time).toBe('78.99')
    expect(row.total).toBe('80.99')
    expect(row.pen).toBe(2)
    expect(row.rank).toBe(1)
    expect(row.gates).toBe('0  0  2  0  0  0')
    expect(row.club).toBe('TJ Test')
    expect(row.startOrder).toBe(1)
  })

  it('handles DNS/DNF status', async () => {
    const mockResponse = {
      results: [
        {
          raceId: 'K1M_BR1_18',
          id: '999.K1M',
          startOrder: 5,
          bib: '5',
          status: 'DNS',
          participant: {
            id: '999.K1M',
            classId: 'K1M',
            bib: '5',
            familyName: 'ABSENT',
            givenName: 'Tom',
            club: '',
            isTeam: false,
          },
        },
      ],
    }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await fetchRaceResults('K1M_BR1_18', 'http://localhost:27123')
    const row = result!.rows[0]
    expect(row.status).toBe('DNS')
    expect(row.time).toBe('')
    expect(row.total).toBe('')
    expect(row.gates).toBe('')
  })

  it('returns null on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
    const result = await fetchRaceResults('K1M_BR1_18', 'http://localhost:27123')
    expect(result).toBeNull()
  })

  it('returns null on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response)
    const result = await fetchRaceResults('K1M_BR1_18', 'http://localhost:27123')
    expect(result).toBeNull()
  })
})
