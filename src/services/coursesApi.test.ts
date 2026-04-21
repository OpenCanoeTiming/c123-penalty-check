import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchCourses } from './coursesApi'

describe('fetchCourses', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns courseNr-to-config map from REST courses', async () => {
    const mockResponse = {
      courses: [
        { courseNr: 1, courseConfig: 'NNRNSNNRSN', splits: [5, 9] },
        { courseNr: 2, courseConfig: 'RNNR', splits: [] },
      ],
    }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await fetchCourses('http://localhost:27123')

    expect(result.size).toBe(2)
    const course1 = result.get(1)!
    expect(course1.courseNr).toBe(1)
    expect(course1.gateConfig).toBe('NNRNNNRN') // S removed
    expect(course1.nrGates).toBe(8)

    const course2 = result.get(2)!
    expect(course2.gateConfig).toBe('RNNR')
    expect(course2.nrGates).toBe(4)
  })

  it('returns empty map on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
    const result = await fetchCourses('http://localhost:27123')
    expect(result.size).toBe(0)
  })

  it('returns empty map on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response)
    const result = await fetchCourses('http://localhost:27123')
    expect(result.size).toBe(0)
  })
})
