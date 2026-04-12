/**
 * Courses API Client
 *
 * REST API client for fetching course configuration data from c123-server.
 * Used for auto-loading gate groups based on course segments.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Course configuration from XML data
 */
export interface CourseData {
  /** Course number (1-based) */
  courseNr: number
  /** Gate configuration string (N=normal, R=reverse, S=split) */
  courseConfig: string
  /** Gate numbers where splits occur (1-indexed) */
  splits: number[]
}

export interface CoursesResponse {
  courses: CourseData[]
}

import { getApiBaseUrl } from './serverConfig'

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch course configuration data from c123-server
 *
 * @returns Promise with courses data or null if not available
 */
export async function fetchCourses(): Promise<CoursesResponse | null> {
  const baseUrl = getApiBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/api/xml/courses`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      // XML data might not be available
      if (response.status === 503) {
        return null
      }
      throw new Error(`HTTP ${response.status}`)
    }

    return (await response.json()) as CoursesResponse
  } catch {
    // Network error or server not available
    return null
  }
}

/**
 * Get splits for a specific course number
 *
 * @param courseNr - Course number (1-based, usually 1 for short track, 2 for middle)
 * @returns Array of gate numbers where splits occur, or empty array
 */
export async function getCourseSplits(courseNr: number): Promise<number[]> {
  const data = await fetchCourses()
  if (!data) return []

  const course = data.courses.find((c) => c.courseNr === courseNr)
  return course?.splits ?? []
}

// =============================================================================
// Exports
// =============================================================================

export const coursesApi = {
  fetchCourses,
  getCourseSplits,
}
