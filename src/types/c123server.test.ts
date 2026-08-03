import { describe, it, expect } from 'vitest'
import { isChecksChangedMessage, isFlagChangedMessage } from './c123server'

describe('checks message guards', () => {
  it('recognises ChecksChanged', () => {
    const msg = {
      type: 'ChecksChanged',
      timestamp: '2026-08-03T10:00:00.000Z',
      data: { event: 'check-set', raceId: 'K1M_BR1', bib: '42', gate: 5 },
    }
    expect(isChecksChangedMessage(msg as never)).toBe(true)
    expect(isFlagChangedMessage(msg as never)).toBe(false)
  })

  it('recognises FlagChanged', () => {
    const msg = {
      type: 'FlagChanged',
      timestamp: '2026-08-03T10:00:00.000Z',
      data: { event: 'flag-created', raceId: 'K1M_BR1', flag: { id: 'f1' } },
    }
    expect(isFlagChangedMessage(msg as never)).toBe(true)
  })

  it('rejects unrelated messages', () => {
    expect(isChecksChangedMessage({ type: 'Results' } as never)).toBe(false)
  })
})
