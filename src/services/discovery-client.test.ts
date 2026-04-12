import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  normalizeServerUrl,
  getWebSocketUrl,
  getSubnetsToScan,
  getHostingServerIP,
  C123_PORT,
  STORAGE_KEY,
} from './discovery-client'
import { wsToHttpUrl, getApiBaseUrl, setApiBaseUrl } from './serverConfig'

describe('discovery-client', () => {
  describe('normalizeServerUrl', () => {
    it('adds http:// and default port to bare IP', () => {
      expect(normalizeServerUrl('192.168.1.50')).toBe('http://192.168.1.50:27123')
    })

    it('adds http:// and default port to hostname', () => {
      expect(normalizeServerUrl('server.local')).toBe('http://server.local:27123')
    })

    it('adds http:// but keeps explicit port', () => {
      expect(normalizeServerUrl('192.168.1.50:8080')).toBe('http://192.168.1.50:8080')
    })

    it('keeps existing http:// protocol', () => {
      expect(normalizeServerUrl('http://192.168.1.50:27123')).toBe('http://192.168.1.50:27123')
    })

    it('keeps existing https:// protocol', () => {
      expect(normalizeServerUrl('https://server.example.com:443')).toBe('https://server.example.com:443')
    })

    it('adds default port to http:// URL without port', () => {
      expect(normalizeServerUrl('http://192.168.1.50')).toBe('http://192.168.1.50:27123')
    })

    it('preserves path when adding port', () => {
      expect(normalizeServerUrl('http://192.168.1.50/api')).toBe('http://192.168.1.50:27123/api')
    })

    it('trims whitespace', () => {
      expect(normalizeServerUrl('  192.168.1.50  ')).toBe('http://192.168.1.50:27123')
    })

    it('uses custom default port', () => {
      expect(normalizeServerUrl('192.168.1.50', 9999)).toBe('http://192.168.1.50:9999')
    })
  })

  describe('getWebSocketUrl', () => {
    it('converts http URL to ws URL with /ws path', () => {
      expect(getWebSocketUrl('http://192.168.1.50:27123')).toBe('ws://192.168.1.50:27123/ws')
    })

    it('converts https URL to wss URL', () => {
      expect(getWebSocketUrl('https://server.example.com:443')).toBe('wss://server.example.com:443/ws')
    })

    it('appends clientId as query parameter', () => {
      expect(getWebSocketUrl('http://192.168.1.50:27123', 'my-client')).toBe(
        'ws://192.168.1.50:27123/ws?clientId=my-client'
      )
    })

    it('encodes special characters in clientId', () => {
      expect(getWebSocketUrl('http://localhost:27123', 'client A&B')).toBe(
        'ws://localhost:27123/ws?clientId=client%20A%26B'
      )
    })
  })

  describe('wsToHttpUrl', () => {
    it('converts ws:// to http://', () => {
      expect(wsToHttpUrl('ws://192.168.1.50:27123/ws')).toBe('http://192.168.1.50:27123')
    })

    it('converts wss:// to http://', () => {
      expect(wsToHttpUrl('wss://server.example.com:443/ws')).toBe('http://server.example.com:443')
    })

    it('strips query parameters from /ws path', () => {
      expect(wsToHttpUrl('ws://localhost:27123/ws?clientId=test')).toBe('http://localhost:27123')
    })

    it('handles URL without /ws path', () => {
      expect(wsToHttpUrl('ws://localhost:27123')).toBe('http://localhost:27123')
    })
  })

  describe('getSubnetsToScan', () => {
    it('returns an array starting with the host subnet', () => {
      const subnets = getSubnetsToScan()
      expect(subnets.length).toBeGreaterThanOrEqual(1)
      // First entry should be derived from the hosting server IP
      const hostIP = getHostingServerIP()
      const expectedSubnet = hostIP.split('.').slice(0, 3).join('.')
      expect(subnets[0]).toBe(expectedSubnet)
    })

    it('includes common LAN subnets', () => {
      const subnets = getSubnetsToScan()
      expect(subnets).toContain('192.168.1')
      expect(subnets).toContain('192.168.0')
      expect(subnets).toContain('10.0.0')
    })

    it('has no duplicate entries', () => {
      const subnets = getSubnetsToScan()
      const unique = new Set(subnets)
      expect(unique.size).toBe(subnets.length)
    })
  })

  describe('C123_PORT', () => {
    it('is 27123', () => {
      expect(C123_PORT).toBe(27123)
    })
  })

  describe('getApiBaseUrl — legacy cache migration', () => {
    beforeEach(() => {
      setApiBaseUrl(null)
      localStorage.clear()
    })

    afterEach(() => {
      localStorage.clear()
    })

    it('converts legacy ws:// cache entry to http://', () => {
      localStorage.setItem(STORAGE_KEY, 'ws://192.168.1.50:27123/ws')
      expect(getApiBaseUrl()).toBe('http://192.168.1.50:27123')
    })

    it('returns http:// cache entry as-is', () => {
      localStorage.setItem(STORAGE_KEY, 'http://192.168.1.50:27123')
      expect(getApiBaseUrl()).toBe('http://192.168.1.50:27123')
    })
  })
})
