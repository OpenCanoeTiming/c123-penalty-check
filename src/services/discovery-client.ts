/**
 * C123 Server Discovery Client
 *
 * Discovers C123 Server on a local network by probing /api/discover.
 * Adapted from c123-scoreboard's discovery-client.ts.
 *
 * Usage:
 *   const serverUrl = await discoverC123Server();
 *   if (serverUrl) {
 *     const ws = new WebSocket(getWebSocketUrl(serverUrl));
 *   }
 */

// =============================================================================
// Configuration
// =============================================================================

/** Default C123 Server port */
export const C123_PORT = 27123

/** Timeout for discovery probe requests (ms) - subnet scan */
export const DISCOVERY_TIMEOUT = 200

/** Timeout for cached/explicit server probe (ms) - longer for reliability */
export const PROBE_TIMEOUT = 3000

/** LocalStorage key for caching discovered server */
export const STORAGE_KEY = 'c123-server-url'

// =============================================================================
// Types
// =============================================================================

/** Response from /api/discover endpoint */
export interface DiscoverResponse {
  service: 'c123-server'
  version: string
  port: number
  eventName?: string
}

/** Options for discovery */
export interface DiscoveryOptions {
  /** Override default port (27123) */
  port?: number
  /** Override probe timeout (200ms) */
  timeout?: number
  /** Disable localStorage caching */
  noCache?: boolean
  /** Skip URL parameter check */
  ignoreUrlParam?: boolean
  /** Custom subnets to scan (e.g., ['192.168.1', '10.0.0']) */
  subnets?: string[]
}

// =============================================================================
// Main Discovery Function
// =============================================================================

/**
 * Discover C123 Server on the local network.
 *
 * Discovery priority:
 * 1. URL parameter `?server=host:port` - explicit configuration
 * 2. Cached server from localStorage - verify if still alive
 * 3. Subnet scan - starting from hosting server IP
 *
 * @param options - Discovery configuration options
 * @returns Server URL (e.g., "http://192.168.1.50:27123") or null if not found
 */
export async function discoverC123Server(
  options: DiscoveryOptions = {}
): Promise<string | null> {
  const port = options.port ?? C123_PORT
  const scanTimeout = options.timeout ?? DISCOVERY_TIMEOUT
  const probeTimeout = PROBE_TIMEOUT // Longer timeout for explicit/cached servers

  // 1. Check URL parameter (with longer timeout)
  if (!options.ignoreUrlParam) {
    const urlParam = new URLSearchParams(location.search).get('server')
    if (urlParam) {
      const url = normalizeServerUrl(urlParam, port)
      if (await isServerAlive(url, probeTimeout)) {
        if (!options.noCache) saveToCache(url)
        return url
      }
    }
  }

  // 2. Check cached server (with longer timeout)
  // If cache fails, fall through to subnet scan (autodiscover)
  if (!options.noCache) {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      if (await isServerAlive(cached, probeTimeout)) {
        return cached
      }
      // Cache server not responding - clear cache and continue to autodiscover
      clearCache()
    }
  }

  // 3. Scan subnets (autodiscover with short timeout for speed)
  const subnets = options.subnets ?? getSubnetsToScan()
  for (const subnet of subnets) {
    const discovered = await scanSubnet(subnet, port, scanTimeout)
    if (discovered) {
      if (!options.noCache) saveToCache(discovered)
      return discovered
    }
  }

  return null
}

// =============================================================================
// IP Detection
// =============================================================================

/**
 * Get IP address of the server hosting the app.
 *
 * If the app is served from an IP address (common in local networks),
 * that IP is returned directly. Otherwise, falls back to common LAN patterns.
 */
export function getHostingServerIP(): string {
  const hostname = location.hostname

  // If already an IP address, use it
  if (isIPAddress(hostname)) {
    return hostname
  }

  // Localhost - likely development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '127.0.0.1'
  }

  // Fallback: common local network gateway
  return '192.168.1.1'
}

/**
 * Get list of subnets to scan, ordered by likelihood.
 *
 * Starts with the hosting server's subnet, then adds common LAN subnets.
 */
export function getSubnetsToScan(): string[] {
  const hostIP = getHostingServerIP()
  const hostSubnet = hostIP.split('.').slice(0, 3).join('.')

  const subnets = [hostSubnet]

  // Add common subnets if not already included
  const commonSubnets = ['192.168.1', '192.168.0', '10.0.0', '172.16.0']
  for (const subnet of commonSubnets) {
    if (!subnets.includes(subnet)) {
      subnets.push(subnet)
    }
  }

  return subnets
}

// =============================================================================
// Subnet Scanning
// =============================================================================

/**
 * Scan a subnet for C123 Server.
 *
 * Scans in an optimized order: starts from IP ending in .1 (common for servers),
 * then .2, .10, .100, etc., followed by remaining addresses.
 */
export async function scanSubnet(
  subnet: string,
  port: number = C123_PORT,
  timeout: number = DISCOVERY_TIMEOUT
): Promise<string | null> {
  // Generate IPs in optimized order
  const priorityHosts = [1, 2, 10, 100, 50, 150, 200, 254]
  const ipsToScan: string[] = []

  // Add priority hosts first
  for (const host of priorityHosts) {
    ipsToScan.push(`${subnet}.${host}`)
  }

  // Add remaining hosts
  for (let host = 3; host <= 254; host++) {
    if (!priorityHosts.includes(host)) {
      ipsToScan.push(`${subnet}.${host}`)
    }
  }

  // Scan in batches for performance
  const BATCH_SIZE = 20
  for (let i = 0; i < ipsToScan.length; i += BATCH_SIZE) {
    const batch = ipsToScan.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map((ip) => probeServer(ip, port, timeout).catch(() => null))
    )

    const found = results.find((r) => r !== null)
    if (found) return found
  }

  return null
}

/**
 * Probe a single IP for C123 Server.
 */
export async function probeServer(
  ip: string,
  port: number = C123_PORT,
  timeout: number = DISCOVERY_TIMEOUT
): Promise<string | null> {
  const url = `http://${ip}:${port}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(`${url}/api/discover`, {
      signal: controller.signal,
      // Prevent CORS preflight for faster probing
      mode: 'cors',
      credentials: 'omit',
    })

    if (response.ok) {
      const data: DiscoverResponse = await response.json()
      if (data.service === 'c123-server') {
        return url
      }
    }
  } catch {
    // Timeout or network error - server not found at this IP
  } finally {
    clearTimeout(timeoutId)
  }

  return null
}

// =============================================================================
// Server Verification
// =============================================================================

/**
 * Check if a server URL is responding.
 */
export async function isServerAlive(
  url: string,
  timeout: number = DISCOVERY_TIMEOUT
): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(`${url}/api/discover`, {
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data: DiscoverResponse = await response.json()
      return data.service === 'c123-server'
    }

    return false
  } catch {
    return false
  }
}

// =============================================================================
// URL Utilities
// =============================================================================

/**
 * Normalize server URL (add protocol and port if missing).
 *
 * @param input - User input (e.g., "192.168.1.50", "server.local:8080")
 * @param defaultPort - Port to use if not specified
 * @returns Normalized URL (e.g., "http://192.168.1.50:27123")
 */
export function normalizeServerUrl(
  input: string,
  defaultPort: number = C123_PORT
): string {
  let url = input.trim()

  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`
  }

  // Add port if missing
  const protocolEnd = url.indexOf('//') + 2
  const pathStart = url.indexOf('/', protocolEnd)
  const hostPart =
    pathStart === -1 ? url.slice(protocolEnd) : url.slice(protocolEnd, pathStart)

  if (!hostPart.includes(':')) {
    if (pathStart === -1) {
      url = `${url}:${defaultPort}`
    } else {
      url = `${url.slice(0, pathStart)}:${defaultPort}${url.slice(pathStart)}`
    }
  }

  return url
}

/**
 * Extract WebSocket URL from HTTP server URL.
 *
 * @param httpUrl - HTTP server URL (e.g., "http://192.168.1.50:27123")
 * @param clientId - Optional client ID for identification
 * @returns WebSocket URL (e.g., "ws://192.168.1.50:27123/ws")
 */
export function getWebSocketUrl(httpUrl: string, clientId?: string): string {
  const wsUrl = httpUrl.replace(/^http/, 'ws') + '/ws'
  if (clientId) {
    return `${wsUrl}?clientId=${encodeURIComponent(clientId)}`
  }
  return wsUrl
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Save server URL to localStorage cache.
 */
export function saveToCache(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url)
  } catch {
    // localStorage might be unavailable (private browsing, etc.)
  }
}

/**
 * Get cached server URL.
 */
export function getFromCache(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Clear cached server URL.
 */
export function clearCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a string is a valid IPv4 address.
 */
function isIPAddress(str: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(str)
}

