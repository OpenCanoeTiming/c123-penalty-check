import { describe, it, expect, vi } from 'vitest'
import { submitPenaltyAndVerify, pickVerificationProps } from './verification'

describe('submitPenaltyAndVerify', () => {
  it('verifies the gate after a successful write, in that order (rule 4)', async () => {
    const order: string[] = []
    const setGatePenalty = vi.fn(async () => {
      order.push('write')
      return true
    })
    const verifyGate = vi.fn(async () => {
      order.push('verify')
      return true
    })

    await submitPenaltyAndVerify('10', 5, 2, 'race-1', {
      setGatePenalty,
      verifyGate,
      checksAvailable: true,
    })

    expect(order).toEqual(['write', 'verify'])
    expect(verifyGate).toHaveBeenCalledWith('race-1', '10', 5, 2)
  })

  it('does not verify when the write fails', async () => {
    const setGatePenalty = vi.fn(async () => false)
    const verifyGate = vi.fn(async () => true)

    await submitPenaltyAndVerify('10', 5, 2, 'race-1', {
      setGatePenalty,
      verifyGate,
      checksAvailable: true,
    })

    expect(verifyGate).not.toHaveBeenCalled()
  })

  it('does not verify a deleted penalty - an empty gate is not verifiable (rule 3)', async () => {
    const setGatePenalty = vi.fn(async () => true)
    const verifyGate = vi.fn(async () => true)

    await submitPenaltyAndVerify('10', 5, null, 'race-1', {
      setGatePenalty,
      verifyGate,
      checksAvailable: true,
    })

    expect(verifyGate).not.toHaveBeenCalled()
  })

  it('does not verify without a raceId', async () => {
    const setGatePenalty = vi.fn(async () => true)
    const verifyGate = vi.fn(async () => true)

    await submitPenaltyAndVerify('10', 5, 2, undefined, {
      setGatePenalty,
      verifyGate,
      checksAvailable: true,
    })

    expect(verifyGate).not.toHaveBeenCalled()
  })

  it('does not verify when checks are unavailable', async () => {
    const setGatePenalty = vi.fn(async () => true)
    const verifyGate = vi.fn(async () => true)

    await submitPenaltyAndVerify('10', 5, 2, 'race-1', {
      setGatePenalty,
      verifyGate,
      checksAvailable: false,
    })

    expect(verifyGate).not.toHaveBeenCalled()
  })
})

describe('pickVerificationProps', () => {
  it('passes the props through when available', () => {
    const props = { getGateStatus: vi.fn(), onToggleCheck: vi.fn() }
    expect(pickVerificationProps(true, props)).toBe(props)
  })

  it('withholds every prop when unavailable - not just replaces them with no-ops', () => {
    const props = { getGateStatus: vi.fn(), onToggleCheck: vi.fn() }
    const result = pickVerificationProps(false, props)
    expect(result).toEqual({})
    expect('getGateStatus' in result).toBe(false)
    expect('onToggleCheck' in result).toBe(false)
  })
})
