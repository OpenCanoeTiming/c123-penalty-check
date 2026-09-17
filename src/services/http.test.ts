/**
 * describeApiError - the operator-facing wording of a failed REST call.
 *
 * The rest of http.ts (timeout, retry budget, 4xx/5xx split) is exercised
 * through the API clients' own suites; this covers only the translation
 * layer, because that is the part whose whole job is to never put a raw
 * `TypeError: Failed to fetch` in front of someone standing at a river.
 */

import { describe, it, expect } from 'vitest'
import { ApiRequestError, describeApiError } from './http'

describe('describeApiError', () => {
  it("prefers the server's own detail over its error text", () => {
    const error = new ApiRequestError('Flag not found', 404, 'No flag f1 in race R1')
    expect(describeApiError(error)).toBe('No flag f1 in race R1')
  })

  it("falls back to the server's error text when there is no detail", () => {
    expect(describeApiError(new ApiRequestError('Flag not found', 404))).toBe('Flag not found')
  })

  it('explains the synthesized HTTP <status> placeholder instead of passing it through', () => {
    // fetchWithRetry synthesizes this when the response carried no parseable
    // body - on its own it reads like a bug rather than an outcome.
    expect(describeApiError(new ApiRequestError('HTTP 500', 500))).toBe(
      'The server rejected the request (HTTP 500).'
    )
  })

  it('names the timeout for 408, which only fetchWithTimeout produces', () => {
    expect(describeApiError(new ApiRequestError('Request timeout', 408))).toBe(
      'The server did not respond in time. Try again.'
    )
  })

  it('does not leak a raw fetch TypeError - the CORS/offline case', () => {
    // A request the browser refuses outright (blocked by CORS, or the server
    // unreachable) arrives here as exactly this, and 'Failed to fetch' names
    // nothing an operator can act on.
    const message = describeApiError(new TypeError('Failed to fetch'))
    expect(message).not.toMatch(/Failed to fetch/)
    expect(message).toBe('Could not reach the server - it may be offline or blocking the request.')
  })

  it('handles a non-Error throw without crashing', () => {
    expect(describeApiError('something odd')).toBe(
      'Could not reach the server - it may be offline or blocking the request.'
    )
  })
})
