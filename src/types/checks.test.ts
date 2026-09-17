import { describe, it, expect } from 'vitest'
import { EMPTY_RACE_CHECKS } from './checks'

describe('EMPTY_RACE_CHECKS', () => {
  it('is frozen so a caller cannot mutate the shared default in place', () => {
    // Consumers default an unknown race to this one shared instance instead
    // of allocating a fresh object. If it were mutable, a single
    // `flags.push(...)` written against what looked like "this race's
    // flags" would silently corrupt the constant for every race that ever
    // defaults through it.
    expect(Object.isFrozen(EMPTY_RACE_CHECKS)).toBe(true)
    expect(Object.isFrozen(EMPTY_RACE_CHECKS.checks)).toBe(true)
    expect(Object.isFrozen(EMPTY_RACE_CHECKS.flags)).toBe(true)
  })
})
