/**
 * Utilities for time formatting and conversion
 */

/**
 * Convert time string to seconds format
 * Handles both "mm:ss.cc" and "ss.cc" formats
 *
 * @param time - Time string like "1:30.45" or "90.45"
 * @returns Time in seconds as string like "90.45", or empty string for invalid input
 */
export function formatTimeAsSeconds(time: string | null | undefined): string {
  if (!time || time === '') return ''

  // If contains colon, convert from mm:ss.cc to seconds
  if (time.includes(':')) {
    const [mins, secs] = time.split(':')
    const minutes = parseInt(mins, 10)
    const seconds = parseFloat(secs)

    if (isNaN(minutes) || isNaN(seconds)) return time

    const totalSeconds = minutes * 60 + seconds
    return totalSeconds.toFixed(2)
  }

  // Already in seconds format, return as is
  return time
}
