import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useServerDiscovery } from './useServerDiscovery'
import { discoverC123Server } from '../services/discovery-client'

vi.mock('../services/discovery-client', async (importActual) => ({
  ...(await importActual<typeof import('../services/discovery-client')>()),
  discoverC123Server: vi.fn(),
}))

const DEFAULT_SERVER_URL = 'ws://localhost:27123/ws'

// A `wrapper: StrictMode` does not trigger the mount/cleanup/remount cycle in
// renderHook - only the reactStrictMode option does.
const STRICT = { reactStrictMode: true }

describe('useServerDiscovery', () => {
  beforeEach(() => {
    vi.mocked(discoverC123Server).mockReset()
  })

  it('resolves to found under StrictMode (#130)', async () => {
    vi.mocked(discoverC123Server).mockResolvedValue('http://192.168.1.50:27123')

    const { result } = renderHook(() => useServerDiscovery({ serverUrl: DEFAULT_SERVER_URL }), STRICT)

    await waitFor(() => expect(result.current.status).toBe('found'))
    expect(result.current.httpBaseUrl).toBe('http://192.168.1.50:27123')
    expect(result.current.wsUrl).toBe('ws://192.168.1.50:27123/ws')
  })

  it('resolves to not-found under StrictMode when nothing is discovered', async () => {
    vi.mocked(discoverC123Server).mockResolvedValue(null)

    const { result } = renderHook(() => useServerDiscovery({ serverUrl: DEFAULT_SERVER_URL }), STRICT)

    await waitFor(() => expect(result.current.status).toBe('not-found'))
  })

  it('runs only one discovery (subnet scan) across a StrictMode remount', async () => {
    vi.mocked(discoverC123Server).mockResolvedValue('http://192.168.1.50:27123')

    const { result } = renderHook(() => useServerDiscovery({ serverUrl: DEFAULT_SERVER_URL }), STRICT)

    await waitFor(() => expect(result.current.status).toBe('found'))
    expect(discoverC123Server).toHaveBeenCalledTimes(1)
  })

  it('skips discovery for a non-default server URL', () => {
    const { result } = renderHook(() => useServerDiscovery({ serverUrl: 'ws://10.0.0.5:27123/ws' }), STRICT)

    expect(result.current.status).toBe('not-found')
    expect(discoverC123Server).not.toHaveBeenCalled()
  })
})
