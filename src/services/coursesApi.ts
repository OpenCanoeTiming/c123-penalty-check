/**
 * Courses API Client
 *
 * Fetches course configuration from c123-server REST API.
 * Used to get per-race gate configuration (number of gates, N/R pattern).
 */

import { getApiBaseUrl } from './serverConfig'

export interface CourseConfig {
  courseNr: number
  nrGates: number
  gateConfig: string // "NNRNNR..." (N and R only, S removed)
}

interface RestCourse {
  courseNr: number
  courseConfig: string // "NNRNSNNRSN..." (includes S for splits)
  splits: number[]
}

interface RestCoursesResponse {
  courses: RestCourse[]
}

/**
 * Strip split markers (S) from courseConfig to get gate-only config.
 * "NNRNSNNR" → "NNRNNNR", nrGates = 7
 */
function parseCourseConfig(config: string): { nrGates: number; gateConfig: string } {
  const gateConfig = config.replace(/S/g, '')
  return { nrGates: gateConfig.length, gateConfig }
}

/**
 * Fetch courses from REST API and return a map of courseNr → CourseConfig.
 * Returns empty map on any error (graceful degradation).
 */
export async function fetchCourses(baseUrl?: string): Promise<Map<number, CourseConfig>> {
  const url = baseUrl ?? getApiBaseUrl()
  try {
    const response = await fetch(`${url}/api/xml/courses`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return new Map()

    const data: RestCoursesResponse = await response.json()
    const courseMap = new Map<number, CourseConfig>()

    for (const course of data.courses ?? []) {
      const { nrGates, gateConfig } = parseCourseConfig(course.courseConfig)
      courseMap.set(course.courseNr, { courseNr: course.courseNr, nrGates, gateConfig })
    }

    return courseMap
  } catch {
    return new Map()
  }
}
