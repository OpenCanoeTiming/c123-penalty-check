# Advanced Penalty Checks Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the operator verify penalties against paper protocols gate by gate, with state persisted in c123-server and a per-race "verified" indicator the head judge can rely on.

**Architecture:** A new `useChecks` hook owns the whole event's verification state in memory, loaded in one `GET /api/checks` call and kept live by `ChecksChanged` / `FlagChanged` WebSocket events. Writes are optimistic against a REST client that mirrors the existing `scoringApi` patterns. The grid renders verification as cell texture; the existing context menu gains the same actions so nothing is shortcut-only.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + @testing-library/react, Playwright, `@opencanoetiming/timing-design-system`.

**Spec:** `docs/superpowers/specs/2026-08-03-penalty-checks-workflow-design.md`

## Global Constraints

- **Server requirement:** c123-server **0.12.0+**. Endpoints and WS events below do not exist in earlier versions.
- **`PUT /check` must always send an explicit `value`.** Omitting it makes the server snapshot a stale value from XML. See `../c123-server/docs/REST-API.md:1855`.
- **No new grid column, no grid width growth** beyond widening the existing 2px group boundary to ~12px.
- **Design system mandatory** — use `@opencanoetiming/timing-design-system` tokens, no inline styles (project CLAUDE.md rule 3).
- **Do not modify c123-server** (project CLAUDE.md rule 1). It already ships everything needed.
- **Never `git add -A`** — `.superpowers/` and `.claude/` are local state (project CLAUDE.md rule 5).
- **Conventional commits.** `feat:` / `fix:` / `refactor:` / `test:` / `docs:`. Never touch `package.json` version or `CHANGELOG.md`.
- **Team races out of scope**, but every penalty value crossing the checks boundary is typed `number | null`, never `PenaltyValue`, so cumulative values (52/100/150) do not need a rewrite later.
- Branch: `feat/4-penalty-checks-workflow` (already checked out).
- Run tests with `npm test`. Single file: `npx vitest run src/path/file.test.ts`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/services/http.ts` | **New.** Shared `fetchWithRetry` + `ApiRequestError`, extracted from `scoringApi`. |
| `src/services/scoringApi.ts` | **Modify.** Consume the shared helper; re-export `ScoringApiError` for compatibility. |
| `src/types/checks.ts` | **New.** Wire types mirroring the server, key helpers, `GateCheckStatus`. |
| `src/services/checksApi.ts` | **New.** REST client for `/api/checks`. |
| `src/hooks/useChecks.ts` | **New.** Event-wide check state, per-race selectors, optimistic mutations, stale detection. |
| `src/hooks/useCheckedState.ts` | **Delete.** Replaced; its `bib:groupId` model does not match the server. |
| `src/types/c123server.ts` | **Modify.** `ChecksChanged` / `FlagChanged` message types + type guards. |
| `src/hooks/useC123WebSocket.ts` | **Modify.** Surface the two new events to consumers. |
| `src/components/ResultsGrid/ResultsGrid.tsx` | **Modify.** Cell status classes, section control, Space / Shift+Space. |
| `src/components/ResultsGrid/ResultsGrid.module.css` | **Modify.** Hatching, stale, flag, section control. |
| `src/components/ResultsGrid/PenaltyContextMenu.tsx` | **Modify.** Second action group. |
| `src/components/FlagDialog/` | **New.** Create and resolve a flag. |
| `src/components/RaceSelector/RaceSelector.tsx` | **Modify.** Per-race verification indicator. |
| `src/App.tsx` | **Modify.** Wire `useChecks`, graceful disable, remove dead progress path. |

---

### Task 1: Extract the shared HTTP helper

`checksApi` needs the same timeout / retry / error semantics as `scoringApi`. Extract rather than duplicate. Behaviour must not change — the existing scoring tests are the proof.

**Files:**
- Create: `src/services/http.ts`
- Modify: `src/services/scoringApi.ts:51-154`
- Test: existing `src/hooks/useScoring.test.ts` must stay green

**Interfaces:**
- Consumes: nothing
- Produces: `ApiRequestError` (class, `.status: number`, `.detail?: string`, `.isC123Disconnected`, `.isValidationError`), `fetchWithRetry<T>(url: string, options: RequestInit, retries?: number): Promise<T>`

- [ ] **Step 1: Create `src/services/http.ts`**

Move `DEFAULT_TIMEOUT`, `MAX_RETRIES`, `RETRY_DELAY`, `delay`, `fetchWithTimeout`, `fetchWithRetry` and the error class out of `scoringApi.ts` verbatim, renaming only the class:

```ts
/**
 * Shared HTTP helper for c123-server REST clients.
 *
 * Timeout, bounded retry on network and 5xx errors, no retry on 4xx.
 */

export interface ApiErrorBody {
  error: string
  detail?: string
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly detail?: string

  constructor(message: string, status: number, detail?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.detail = detail
  }

  /** C123 (or the checks store) is not available */
  get isC123Disconnected(): boolean {
    return this.status === 503
  }

  get isValidationError(): boolean {
    return this.status === 400
  }

  /** Server does not implement this endpoint — an older c123-server */
  get isUnsupported(): boolean {
    return this.status === 404 || this.status === 503
  }
}

const DEFAULT_TIMEOUT = 5000
const MAX_RETRIES = 2
const RETRY_DELAY = 500

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)

      if (!response.ok) {
        const errorData: Partial<ApiErrorBody> = await response.json().catch(() => ({}))
        throw new ApiRequestError(
          errorData.error || `HTTP ${response.status}`,
          response.status,
          errorData.detail
        )
      }

      if (response.status === 204) {
        return undefined as T
      }

      return (await response.json()) as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (error instanceof ApiRequestError && error.status >= 400 && error.status < 500) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiRequestError('Request timeout', 408)
      }

      if (attempt < retries) {
        await delay(RETRY_DELAY * (attempt + 1))
      }
    }
  }

  throw lastError ?? new Error('Unknown error')
}
```

- [ ] **Step 2: Rewrite `scoringApi.ts` to use it**

Delete lines 51-154 of `scoringApi.ts` (the config, helpers and `ScoringApiError`). Replace the imports and keep the name alive so `useScoring.ts` and its tests need no change:

```ts
import { fetchWithRetry, ApiRequestError } from './http'

/** @deprecated Use ApiRequestError. Kept so existing call sites keep working. */
export { ApiRequestError as ScoringApiError } from './http'
export type { ApiErrorBody as ApiError } from './http'
```

`ScoringApiError` is now the same class object as `ApiRequestError`, so every existing `instanceof ScoringApiError` check still passes. The three `sendX` functions keep their bodies unchanged.

- [ ] **Step 3: Run the full suite to prove nothing changed**

Run: `npm test`
Expected: PASS, same test count as before the change.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc -b --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/services/http.ts src/services/scoringApi.ts
git commit -m "refactor: extract shared HTTP helper from scoringApi"
```

---

### Task 2: Checks types and REST client

**Files:**
- Create: `src/types/checks.ts`
- Create: `src/services/checksApi.ts`
- Test: `src/services/checksApi.test.ts`

**Interfaces:**
- Consumes: `fetchWithRetry`, `ApiRequestError` (Task 1), `getApiBaseUrl()` from `src/services/serverConfig.ts`
- Produces: types `CheckEntry`, `FlagEntry`, `RaceChecksData`, `AllChecksResponse`, `CheckChangedEvent`, `FlagChangedEvent`, `GateCheckStatus`; helper `createGateKey(bib, gate)`; client functions `fetchAllChecks`, `setCheck`, `removeCheck`, `createFlag`, `resolveFlag`, `deleteFlag`

- [ ] **Step 1: Create `src/types/checks.ts`**

```ts
/**
 * Penalty check types.
 *
 * Mirrors c123-server `src/checks/types.ts` (0.12.0+). Penalty values are
 * `number | null`, not PenaltyValue: team races carry cumulative values such
 * as 52/100/150 and the stored snapshot must survive them even though the UI
 * does not offer them yet.
 */

/** A verification of one gate. `value` is the snapshot at check time. */
export interface CheckEntry {
  checkedAt: string
  value: number | null
  tag?: string
}

/** A review request (podnět) on one gate. */
export interface FlagEntry {
  id: string
  bib: string
  gate: number
  createdAt: string
  comment: string
  suggestedValue?: number | null
  resolved: boolean
  resolvedAt?: string
  resolution?: string
}

/**
 * Checks and flags for one race. `checks` is keyed by `bib:gate`; `flags` is a
 * flat array — each entry carries its own bib and gate, so it needs no key.
 * Mirror the server's `src/checks/types.ts` exactly.
 */
export interface RaceChecksData {
  checks: Record<string, CheckEntry>
  flags: FlagEntry[]
}

/** Response of GET /api/checks — the whole event in one payload. */
export interface AllChecksResponse {
  xmlFilename: string | null
  fingerprint: string | null
  races: Record<string, RaceChecksData>
}

export type CheckChangedEventName =
  | 'check-set'
  | 'check-removed'
  | 'check-invalidated'
  | 'checks-cleared'
  | 'checks-reset'

export interface CheckChangedEvent {
  event: CheckChangedEventName
  /** Empty string for 'checks-reset', which discards every race at once. */
  raceId: string
  bib?: string
  gate?: number
  check?: CheckEntry
}

export type FlagChangedEventName = 'flag-created' | 'flag-resolved' | 'flag-deleted'

export interface FlagChangedEvent {
  event: FlagChangedEventName
  raceId: string
  flag: FlagEntry
  /** Present when resolving created an auto-check. */
  check?: CheckEntry
  bib?: string
  gate?: number
}

/** Visual state of a gate cell, loudest first. */
export type GateCheckStatus = 'flagged' | 'stale' | 'verified' | 'plain'

/** Map key for a gate of a competitor. Must match the server's format. */
export function createGateKey(bib: string, gate: number): string {
  return `${bib}:${gate}`
}

export const EMPTY_RACE_CHECKS: RaceChecksData = { checks: {}, flags: [] }
```

- [ ] **Step 2: Write the failing test `src/services/checksApi.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { fetchAllChecks, setCheck, removeCheck, createFlag, resolveFlag, deleteFlag } from './checksApi'
import { ApiRequestError } from './http'

vi.mock('./serverConfig', () => ({
  getApiBaseUrl: () => 'http://server:27123',
}))

function mockJson(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

describe('checksApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches all races in one call', async () => {
    vi.mocked(fetch).mockReturnValue(
      mockJson({ xmlFilename: 'e.xml', fingerprint: 'K1M@2026-08-03', races: {} })
    )

    const result = await fetchAllChecks()

    expect(fetch).toHaveBeenCalledWith(
      'http://server:27123/api/checks',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.xmlFilename).toBe('e.xml')
  })

  it('always sends an explicit value when setting a check', async () => {
    vi.mocked(fetch).mockReturnValue(
      mockJson({ success: true, check: { checkedAt: 'now', value: 2 } })
    )

    await setCheck('K1M_BR1', '42', 5, 2)

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://server:27123/api/checks/K1M_BR1/check')
    expect(options?.method).toBe('PUT')
    expect(JSON.parse(String(options?.body))).toEqual({ bib: '42', gate: 5, value: 2 })
  })

  it('sends value null explicitly rather than omitting it', async () => {
    vi.mocked(fetch).mockReturnValue(
      mockJson({ success: true, check: { checkedAt: 'now', value: null } })
    )

    await setCheck('K1M_BR1', '42', 5, null)

    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))
    expect(body).toHaveProperty('value', null)
  })

  it('url-encodes race ids', async () => {
    vi.mocked(fetch).mockReturnValue(mockJson({ success: true }))

    await removeCheck('K1M ST/BR1', '42', 5)

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      'http://server:27123/api/checks/K1M%20ST%2FBR1/check'
    )
  })

  it('creates a flag with comment and suggested value', async () => {
    vi.mocked(fetch).mockReturnValue(
      mockJson({ success: true, flag: { id: 'f1', bib: '42', gate: 7 } }, 201)
    )

    const flag = await createFlag('K1M_BR1', '42', 7, 'disputed', 50)

    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))
    expect(body).toEqual({ bib: '42', gate: 7, comment: 'disputed', suggestedValue: 50 })
    expect(flag.id).toBe('f1')
  })

  it('resolves a flag and returns the auto-created check', async () => {
    vi.mocked(fetch).mockReturnValue(
      mockJson({
        success: true,
        flag: { id: 'f1', bib: '42', gate: 7, resolved: true },
        check: { checkedAt: 'now', value: 50 },
      })
    )

    const result = await resolveFlag('K1M_BR1', 'f1', 'confirmed from video')

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://server:27123/api/checks/K1M_BR1/flag/f1')
    expect(options?.method).toBe('PATCH')
    expect(result.check?.value).toBe(50)
  })

  it('deletes a flag', async () => {
    vi.mocked(fetch).mockReturnValue(mockJson({ success: true }))

    await deleteFlag('K1M_BR1', 'f1')

    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe('DELETE')
  })

  it('surfaces a 404 as an unsupported ApiRequestError without retrying', async () => {
    vi.mocked(fetch).mockReturnValue(mockJson({ error: 'Not found' }, 404))

    await expect(fetchAllChecks()).rejects.toBeInstanceOf(ApiRequestError)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/services/checksApi.test.ts`
Expected: FAIL — `Failed to resolve import "./checksApi"`.

- [ ] **Step 4: Create `src/services/checksApi.ts`**

```ts
/**
 * Penalty Checks API Client
 *
 * REST client for c123-server /api/checks (0.12.0+).
 */

import { fetchWithRetry } from './http'
import { getApiBaseUrl } from './serverConfig'
import type { AllChecksResponse, CheckEntry, FlagEntry } from '../types/checks'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function raceUrl(raceId: string, suffix = ''): string {
  return `${getApiBaseUrl()}/api/checks/${encodeURIComponent(raceId)}${suffix}`
}

/** Every race of the current event in one call. */
export async function fetchAllChecks(): Promise<AllChecksResponse> {
  return fetchWithRetry<AllChecksResponse>(`${getApiBaseUrl()}/api/checks`, { method: 'GET' })
}

/**
 * Verify a gate.
 *
 * `value` is always sent explicitly: the server's XML fallback would snapshot
 * the previous value after a scoring write and the check would read as stale
 * immediately.
 */
export async function setCheck(
  raceId: string,
  bib: string,
  gate: number,
  value: number | null,
  tag?: string
): Promise<CheckEntry> {
  const body: Record<string, unknown> = { bib, gate, value }
  if (tag !== undefined) body.tag = tag

  const response = await fetchWithRetry<{ success: boolean; check: CheckEntry }>(
    raceUrl(raceId, '/check'),
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) }
  )
  return response.check
}

export async function removeCheck(raceId: string, bib: string, gate: number): Promise<void> {
  await fetchWithRetry<{ success: boolean }>(raceUrl(raceId, '/check'), {
    method: 'DELETE',
    headers: JSON_HEADERS,
    body: JSON.stringify({ bib, gate }),
  })
}

export async function createFlag(
  raceId: string,
  bib: string,
  gate: number,
  comment: string,
  suggestedValue?: number | null
): Promise<FlagEntry> {
  const body: Record<string, unknown> = { bib, gate, comment }
  if (suggestedValue !== undefined) body.suggestedValue = suggestedValue

  const response = await fetchWithRetry<{ success: boolean; flag: FlagEntry }>(
    raceUrl(raceId, '/flag'),
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) }
  )
  return response.flag
}

/** Resolving also verifies the gate — the server creates the check. */
export async function resolveFlag(
  raceId: string,
  flagId: string,
  resolution?: string
): Promise<{ flag: FlagEntry; check?: CheckEntry }> {
  const body: Record<string, unknown> = {}
  if (resolution !== undefined) body.resolution = resolution

  return fetchWithRetry<{ success: boolean; flag: FlagEntry; check?: CheckEntry }>(
    raceUrl(raceId, `/flag/${encodeURIComponent(flagId)}`),
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) }
  )
}

export async function deleteFlag(raceId: string, flagId: string): Promise<void> {
  await fetchWithRetry<{ success: boolean }>(
    raceUrl(raceId, `/flag/${encodeURIComponent(flagId)}`),
    { method: 'DELETE' }
  )
}
```

- [ ] **Step 5: Confirm the response shapes against the server docs**

Open `../c123-server/docs/REST-API.md` and check the Penalty Checks section: `PUT /check` returns `{ success, check }`, `POST /flag` returns 201 `{ success, flag }`, `PATCH /flag/:id` returns `{ success, flag, check? }`, the two `DELETE`s return `{ success }`. If any differs, fix `checksApi.ts` and the test together. Do not change the server.

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/services/checksApi.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 7: Commit**

```bash
git add src/types/checks.ts src/services/checksApi.ts src/services/checksApi.test.ts
git commit -m "feat: add penalty checks REST client and wire types"
```

---

### Task 3: WebSocket event types

**Files:**
- Modify: `src/types/c123server.ts:25-31` (message type union), and the interfaces/guards near `:236-248`
- Test: `src/types/c123server.test.ts` (create if absent)

**Interfaces:**
- Consumes: `CheckChangedEvent`, `FlagChangedEvent` (Task 2)
- Produces: `C123ChecksChangedMessage`, `C123FlagChangedMessage`, guards `isChecksChangedMessage`, `isFlagChangedMessage`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/types/c123server.test.ts`
Expected: FAIL — `isChecksChangedMessage is not a function`.

- [ ] **Step 3: Extend `src/types/c123server.ts`**

Add `'ChecksChanged'` and `'FlagChanged'` to the `C123MessageType` union at line 25, then add alongside the other message interfaces:

```ts
import type { CheckChangedEvent, FlagChangedEvent } from './checks'

export interface C123ChecksChangedMessage {
  type: 'ChecksChanged'
  timestamp: string
  data: CheckChangedEvent
}

export interface C123FlagChangedMessage {
  type: 'FlagChanged'
  timestamp: string
  data: FlagChangedEvent
}
```

Add both to the `C123Message` union, and the guards next to the existing ones:

```ts
export function isChecksChangedMessage(msg: C123Message): msg is C123ChecksChangedMessage {
  return msg.type === 'ChecksChanged'
}

export function isFlagChangedMessage(msg: C123Message): msg is C123FlagChangedMessage {
  return msg.type === 'FlagChanged'
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/types/c123server.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/types/c123server.ts src/types/c123server.test.ts
git commit -m "feat: add ChecksChanged and FlagChanged message types"
```

---

### Task 4: Surface check events from the WebSocket hook

The hook currently folds every message into state. Check events are a stream, not a snapshot: `useChecks` needs each one exactly once. Expose them through a callback instead of state.

**Files:**
- Modify: `src/hooks/useC123WebSocket.ts:37-44` (options), `:113-147` (handleMessage)
- Test: `src/hooks/useC123WebSocket.test.ts` (extend)

**Interfaces:**
- Consumes: guards from Task 3
- Produces: `UseC123WebSocketOptions.onChecksChanged?: (e: CheckChangedEvent) => void`, `UseC123WebSocketOptions.onFlagChanged?: (e: FlagChangedEvent) => void`

- [ ] **Step 1: Write the failing test**

Add to `src/hooks/useC123WebSocket.test.ts`, using the harness that file already
provides: the `MockWebSocket` class with `static getLastInstance()`, its
`simulateOpen()` / `simulateMessage(data)` helpers (`simulateMessage` takes an
object and stringifies it internally), and the `renderHookAsync` wrapper that
flushes effects under fake timers. Do not invent a new harness.

```ts
it('forwards ChecksChanged events to the callback', async () => {
  const onChecksChanged = vi.fn()
  await renderHookAsync(() =>
    useC123WebSocket({ url: 'ws://localhost:27123/ws', onChecksChanged })
  )

  const ws = MockWebSocket.getLastInstance()!

  act(() => {
    ws.simulateOpen()
    ws.simulateMessage({
      type: 'ChecksChanged',
      timestamp: '2026-08-03T10:00:00.000Z',
      data: {
        event: 'check-set',
        raceId: 'K1M_BR1',
        bib: '42',
        gate: 5,
        check: { checkedAt: '2026-08-03T10:00:00.000Z', value: 2 },
      },
    })
  })

  expect(onChecksChanged).toHaveBeenCalledTimes(1)
  expect(onChecksChanged).toHaveBeenCalledWith(
    expect.objectContaining({ event: 'check-set', bib: '42', gate: 5 })
  )
})

it('forwards FlagChanged events and leaves snapshot state untouched', async () => {
  const onFlagChanged = vi.fn()
  const { result } = await renderHookAsync(() =>
    useC123WebSocket({ url: 'ws://localhost:27123/ws', onFlagChanged })
  )

  const ws = MockWebSocket.getLastInstance()!

  act(() => {
    ws.simulateOpen()
    ws.simulateMessage({
      type: 'FlagChanged',
      timestamp: '2026-08-03T10:00:00.000Z',
      data: {
        event: 'flag-created',
        raceId: 'K1M_BR1',
        flag: {
          id: 'f1', bib: '42', gate: 7, createdAt: '2026-08-03T10:00:00.000Z',
          comment: 'disputed', resolved: false,
        },
      },
    })
  })

  expect(onFlagChanged).toHaveBeenCalledTimes(1)
  // Check events are a stream, not a snapshot: they must not land in the
  // hook's cached race data.
  expect(result.current.results.size).toBe(0)
  expect(result.current.onCourse).toBeNull()
})
```

`UseC123WebSocketOptions` currently takes `url`, `clientId`, `autoConnect`,
`reconnectInterval`, `maxReconnectAttempts` — add the two callbacks alongside
them.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/hooks/useC123WebSocket.test.ts`
Expected: FAIL — callback not called.

- [ ] **Step 3: Implement**

Add the two optional callbacks to `UseC123WebSocketOptions`, keep them in refs so `handleMessage` does not need to be re-created on every render:

```ts
const onChecksChangedRef = useRef(options.onChecksChanged)
const onFlagChangedRef = useRef(options.onFlagChanged)
useEffect(() => {
  onChecksChangedRef.current = options.onChecksChanged
  onFlagChangedRef.current = options.onFlagChanged
}, [options.onChecksChanged, options.onFlagChanged])
```

In `handleMessage`, dispatch **before** the `setState` block so the callback is not run inside a state updater:

```ts
if (isChecksChangedMessage(message)) {
  onChecksChangedRef.current?.(message.data)
  return
}
if (isFlagChangedMessage(message)) {
  onFlagChangedRef.current?.(message.data)
  return
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS, including all pre-existing WebSocket tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useC123WebSocket.ts src/hooks/useC123WebSocket.test.ts
git commit -m "feat: forward check and flag events from the WebSocket hook"
```

---

### Task 5: `useChecks` — load, read, stale detection

State first, mutations in Task 6, so each half gets its own review.

**Files:**
- Create: `src/hooks/useChecks.ts`
- Test: `src/hooks/useChecks.test.ts`

**Interfaces:**
- Consumes: `fetchAllChecks` (Task 2), `CheckChangedEvent`, `FlagChangedEvent`, `createGateKey`, `GateCheckStatus`
- Produces:
  - `useChecks(options: { enabled?: boolean }): UseChecksReturn`
  - `UseChecksReturn.available: boolean` — false when the server has no checks API
  - `UseChecksReturn.unavailableReason: { status: number; message: string } | null` — populated only when `available` is false, so Task 11 can tell "server too old" (404) from "no checks file loaded" (503) and show the right instruction
  - `UseChecksReturn.loading: boolean`
  - `UseChecksReturn.getStatus(raceId: string, bib: string, gate: number, liveValue: number | null): GateCheckStatus`
  - `UseChecksReturn.getFlags(raceId: string, bib: string, gate: number): FlagEntry[]`
  - `UseChecksReturn.getRaceProgress(raceId: string, rows: Array<{ bib: string; gates: string; status?: string }>): { checked: number; total: number; done: boolean }`
  - `UseChecksReturn.applyCheckEvent(e: CheckChangedEvent): void`
  - `UseChecksReturn.applyFlagEvent(e: FlagChangedEvent): void`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChecks } from './useChecks'
import { ApiRequestError } from '../services/http'

// importActual keeps the real ChecksUnavailableError class — the hook does an
// `instanceof` against it, which a fully synthetic mock would break.
vi.mock('../services/checksApi', async (importActual) => {
  const actual = await importActual<typeof import('../services/checksApi')>()
  return {
    ...actual,
    fetchAllChecks: vi.fn(),
    setCheck: vi.fn(),
    removeCheck: vi.fn(),
    createFlag: vi.fn(),
    resolveFlag: vi.fn(),
    deleteFlag: vi.fn(),
  }
})
import * as api from '../services/checksApi'
import { ChecksUnavailableError } from '../services/checksApi'

const LOADED = {
  xmlFilename: 'e.xml',
  fingerprint: 'K1M_BR1@2026-08-03',
  races: {
    K1M_BR1: {
      checks: { '42:1': { checkedAt: 't', value: 2 } },
      flags: [{ id: 'f1', bib: '42', gate: 3, createdAt: 't', comment: 'c', resolved: false }],
    },
  },
}

async function renderLoaded() {
  vi.mocked(api.fetchAllChecks).mockResolvedValue(LOADED as never)
  const view = renderHook(() => useChecks({ enabled: true }))
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

describe('useChecks', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('loads the whole event once', async () => {
    const { result } = await renderLoaded()
    expect(api.fetchAllChecks).toHaveBeenCalledTimes(1)
    expect(result.current.available).toBe(true)
  })

  it('reports a verified gate whose value still matches', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('verified')
  })

  it('reports stale when the live value drifted from the snapshot', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getStatus('K1M_BR1', '42', 1, 50)).toBe('stale')
  })

  it('reports plain for an unchecked gate', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('plain')
  })

  it('lets an open flag win over every other state', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getStatus('K1M_BR1', '42', 3, 0)).toBe('flagged')
  })

  it('ignores resolved flags when computing status', async () => {
    vi.mocked(api.fetchAllChecks).mockResolvedValue({
      ...LOADED,
      races: {
        K1M_BR1: {
          checks: {},
          flags: [{ id: 'f1', bib: '42', gate: 3, createdAt: 't', comment: 'c', resolved: true }],
        },
      },
    } as never)
    const { result } = renderHook(() => useChecks({ enabled: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.getStatus('K1M_BR1', '42', 3, 0)).toBe('plain')
  })

  it('counts progress over finished rows only', async () => {
    const { result } = await renderLoaded()
    const rows = [
      { bib: '42', gates: '2 0' },
      { bib: '43', gates: '0 0', status: 'DNF' },
    ]
    // bib 42 contributes 2 gates, one of them checked; bib 43 is excluded
    expect(result.current.getRaceProgress('K1M_BR1', rows)).toEqual({
      checked: 1,
      total: 2,
      done: false,
    })
  })

  it('is done when every gate of every finished row is checked', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getRaceProgress('K1M_BR1', [{ bib: '42', gates: '2' }])).toEqual({
      checked: 1,
      total: 1,
      done: true,
    })
  })

  it('is not done when there is nothing to check yet', async () => {
    const { result } = await renderLoaded()
    expect(result.current.getRaceProgress('K1M_BR1', []).done).toBe(false)
  })

  it('marks itself unavailable when the server has no checks API', async () => {
    // Constructor is (status, detail?) — the message is fixed by the class.
    vi.mocked(api.fetchAllChecks).mockRejectedValue(new ChecksUnavailableError(404))
    const { result } = renderHook(() => useChecks({ enabled: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.available).toBe(false)
  })

  it('stays available when the load fails for an ordinary reason', async () => {
    // A 500 or a dropped connection is not evidence that the server lacks the
    // checks API. Switching the feature off on any error would disable
    // verification mid-race on a transient blip.
    vi.mocked(api.fetchAllChecks).mockRejectedValue(new ApiRequestError('boom', 500))
    const { result } = renderHook(() => useChecks({ enabled: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.available).toBe(true)
  })

  it('applies check-set and check-invalidated events', async () => {
    const { result } = await renderLoaded()

    act(() => {
      result.current.applyCheckEvent({
        event: 'check-set', raceId: 'K1M_BR1', bib: '42', gate: 2,
        check: { checkedAt: 't', value: 0 },
      })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('verified')

    act(() => {
      result.current.applyCheckEvent({
        event: 'check-invalidated', raceId: 'K1M_BR1', bib: '42', gate: 2,
      })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('plain')
  })

  it('drops every race on checks-reset', async () => {
    const { result } = await renderLoaded()

    act(() => {
      result.current.applyCheckEvent({ event: 'checks-reset', raceId: '' })
    })

    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('plain')
    expect(result.current.getFlags('K1M_BR1', '42', 3)).toEqual([])
  })

  it('clears a single race on checks-cleared', async () => {
    const { result } = await renderLoaded()

    act(() => {
      result.current.applyCheckEvent({ event: 'checks-cleared', raceId: 'K1M_BR1' })
    })

    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('plain')
  })

  it('adds and resolves flags from events', async () => {
    const { result } = await renderLoaded()
    const flag = { id: 'f9', bib: '42', gate: 8, createdAt: 't', comment: 'x', resolved: false }

    act(() => {
      result.current.applyFlagEvent({ event: 'flag-created', raceId: 'K1M_BR1', flag })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 8, 0)).toBe('flagged')

    act(() => {
      result.current.applyFlagEvent({
        event: 'flag-resolved',
        raceId: 'K1M_BR1',
        flag: { ...flag, resolved: true, resolvedAt: 't' },
        check: { checkedAt: 't', value: 0 },
      })
    })
    expect(result.current.getStatus('K1M_BR1', '42', 8, 0)).toBe('verified')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/hooks/useChecks.test.ts`
Expected: FAIL — cannot resolve `./useChecks`.

- [ ] **Step 3: Implement `src/hooks/useChecks.ts`**

```ts
/**
 * useChecks — verification state for the whole event.
 *
 * Loaded once from GET /api/checks and kept live by ChecksChanged /
 * FlagChanged events. Gate groups are a UI concept: the server stores per
 * gate and this hook aggregates.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchAllChecks, ChecksUnavailableError } from '../services/checksApi'
import {
  createGateKey,
  EMPTY_RACE_CHECKS,
  type CheckChangedEvent,
  type FlagChangedEvent,
  type FlagEntry,
  type GateCheckStatus,
  type RaceChecksData,
} from '../types/checks'

export interface ProgressRow {
  bib: string
  gates: string
  status?: string
}

export interface RaceProgress {
  checked: number
  total: number
  done: boolean
}

type RacesState = Record<string, RaceChecksData>

// Gate values come from `parseResultsGatesString` (src/utils/gates.ts), the
// parser ResultsGrid already uses on these same rows. Do not write a second
// one: the C123 `gates` string is fixed-width with blanks for deleted
// penalties, so splitting on whitespace collapses holes — which both
// under-counts `total` and shifts every gate number after the hole, producing
// a race that reports "done" while real gates were never checked.

export function useChecks(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options

  const [races, setRaces] = useState<RacesState>({})
  const [available, setAvailable] = useState(false)
  const [unavailableReason, setUnavailableReason] =
    useState<{ status: number; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const loadToken = useRef(0)

  const load = useCallback(async () => {
    if (!enabled) return
    const token = ++loadToken.current
    setLoading(true)
    try {
      const data = await fetchAllChecks()
      if (token !== loadToken.current) return
      setRaces(data.races ?? {})
      setAvailable(true)
      setUnavailableReason(null)
    } catch (error) {
      if (token !== loadToken.current) return
      setRaces({})
      // A server without the checks API is a supported configuration, not a
      // crash: the feature switches off and says so. Only fetchAllChecks can
      // raise ChecksUnavailableError — a 404 from the other endpoints means
      // "already gone" and must never disable the feature.
      if (error instanceof ChecksUnavailableError) {
        setAvailable(false)
        // 404 and 503 mean different things to the operator: upgrade the
        // server, versus load an XML file into the one already running.
        // `detail` carries the server's own text; the class message is the
        // generic fallback.
        setUnavailableReason({
          status: error.status,
          message: error.detail ?? error.message,
        })
      } else {
        setAvailable(true)
        setUnavailableReason(null)
      }
    } finally {
      if (token === loadToken.current) setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void load()
  }, [load])

  const getFlags = useCallback(
    (raceId: string, bib: string, gate: number): FlagEntry[] =>
      (races[raceId]?.flags ?? []).filter((flag) => flag.bib === bib && flag.gate === gate),
    [races]
  )

  const getStatus = useCallback(
    (raceId: string, bib: string, gate: number, liveValue: number | null): GateCheckStatus => {
      const key = createGateKey(bib, gate)
      const race = races[raceId] ?? EMPTY_RACE_CHECKS

      // The server stores flags as a flat array — each entry carries its own
      // bib and gate, so there is no key to index by.
      const hasOpenFlag = (race.flags ?? []).some(
        (flag) => !flag.resolved && flag.bib === bib && flag.gate === gate
      )
      if (hasOpenFlag) return 'flagged'

      const check = race.checks?.[key]
      if (!check) return 'plain'

      // A verification is only worth anything while the value it was taken
      // against still holds. Changes made directly in Canoe123 never reach the
      // server's invalidation hook, so this comparison is the only guard.
      return check.value === liveValue ? 'verified' : 'stale'
    },
    [races]
  )

  const getRaceProgress = useCallback(
    (raceId: string, rows: ProgressRow[]): RaceProgress => {
      const race = races[raceId] ?? EMPTY_RACE_CHECKS
      let checked = 0
      let total = 0

      for (const row of rows) {
        if (row.status) continue // rule 7: finished runs without a status only
        // Null positions stay in `total`: an empty gate is unverifiable, so a
        // race containing one must never read as done.
        const values = parseResultsGatesString(row.gates)
        for (let index = 0; index < values.length; index++) {
          total++
          if (race.checks?.[createGateKey(row.bib, index + 1)]) checked++
        }
      }

      return { checked, total, done: total > 0 && checked === total }
    },
    [races]
  )

  const applyCheckEvent = useCallback((event: CheckChangedEvent) => {
    setRaces((prev) => {
      if (event.event === 'checks-reset') return {}

      const race = prev[event.raceId] ?? EMPTY_RACE_CHECKS

      if (event.event === 'checks-cleared') {
        return { ...prev, [event.raceId]: { checks: {}, flags: [] } }
      }

      if (event.bib === undefined || event.gate === undefined) return prev
      const key = createGateKey(event.bib, event.gate)
      const checks = { ...race.checks }

      if (event.event === 'check-set' && event.check) {
        checks[key] = event.check
      } else {
        delete checks[key]
      }

      return { ...prev, [event.raceId]: { checks, flags: race.flags ?? [] } }
    })
  }, [])

  const applyFlagEvent = useCallback((event: FlagChangedEvent) => {
    setRaces((prev) => {
      const race = prev[event.raceId] ?? EMPTY_RACE_CHECKS
      const existing = race.flags ?? []

      let flags: FlagEntry[]
      if (event.event === 'flag-deleted') {
        flags = existing.filter((flag) => flag.id !== event.flag.id)
      } else if (existing.some((flag) => flag.id === event.flag.id)) {
        flags = existing.map((flag) => (flag.id === event.flag.id ? event.flag : flag))
      } else {
        flags = [...existing, event.flag]
      }

      const checks = { ...race.checks }
      if (event.check) checks[createGateKey(event.flag.bib, event.flag.gate)] = event.check

      return { ...prev, [event.raceId]: { checks, flags } }
    })
  }, [])

  return useMemo(
    () => ({
      available,
      unavailableReason,
      loading,
      races,
      reload: load,
      getStatus,
      getFlags,
      getRaceProgress,
      applyCheckEvent,
      applyFlagEvent,
    }),
    [available, unavailableReason, loading, races, load, getStatus, getFlags, getRaceProgress, applyCheckEvent, applyFlagEvent]
  )
}

export type UseChecksReturn = ReturnType<typeof useChecks>
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/hooks/useChecks.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useChecks.ts src/hooks/useChecks.test.ts
git commit -m "feat: add useChecks with event-wide state and stale detection"
```

---

### Task 6: `useChecks` mutations

**Files:**
- Modify: `src/hooks/useChecks.ts`
- Test: `src/hooks/useChecks.test.ts` (extend)

**Interfaces:**
- Consumes: `setCheck`, `removeCheck` from `checksApi`; `parseResultsGatesString` from `src/utils/gates.ts` (never a locally written gates parser)
- Produces:
  - `verifyGate(raceId, bib, gate, liveValue: number | null): Promise<boolean>` — no-op returning `false` when `liveValue === null`
  - `unverifyGate(raceId, bib, gate): Promise<boolean>`
  - `toggleGate(raceId, bib, gate, liveValue): Promise<boolean>`
  - `verifySection(raceId, bib, gates: number[], liveValues: Map<number, number | null>): Promise<{ verified: number[]; firstEmpty: number | null }>`

- [ ] **Step 1: Write the failing tests**

```ts
describe('useChecks mutations', () => {
  it('verifies a gate optimistically and sends the explicit value', async () => {
    const { result } = await renderLoaded()
    vi.mocked(api.setCheck).mockResolvedValue({ checkedAt: 't', value: 0 })

    await act(async () => {
      await result.current.verifyGate('K1M_BR1', '42', 2, 0)
    })

    expect(api.setCheck).toHaveBeenCalledWith('K1M_BR1', '42', 2, 0)
    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('verified')
  })

  it('rolls back when the write fails', async () => {
    const { result } = await renderLoaded()
    vi.mocked(api.setCheck).mockRejectedValue(new ApiRequestError('boom', 500))

    await act(async () => {
      await result.current.verifyGate('K1M_BR1', '42', 2, 0)
    })

    expect(result.current.getStatus('K1M_BR1', '42', 2, 0)).toBe('plain')
  })

  it('refuses to verify an empty gate', async () => {
    const { result } = await renderLoaded()

    let outcome = true
    await act(async () => {
      outcome = await result.current.verifyGate('K1M_BR1', '42', 9, null)
    })

    expect(outcome).toBe(false)
    expect(api.setCheck).not.toHaveBeenCalled()
  })

  it('toggles a verified gate back to plain', async () => {
    const { result } = await renderLoaded()
    vi.mocked(api.removeCheck).mockResolvedValue(undefined)

    await act(async () => {
      await result.current.toggleGate('K1M_BR1', '42', 1, 2)
    })

    expect(api.removeCheck).toHaveBeenCalledWith('K1M_BR1', '42', 1)
    expect(result.current.getStatus('K1M_BR1', '42', 1, 2)).toBe('plain')
  })

  it('verifies a section, skipping the empty gate and reporting it', async () => {
    const { result } = await renderLoaded()
    vi.mocked(api.setCheck).mockImplementation(
      async (_r, _b, _g, value) => ({ checkedAt: 't', value: value as number })
    )

    let outcome!: { verified: number[]; firstEmpty: number | null }
    await act(async () => {
      outcome = await result.current.verifySection(
        'K1M_BR1', '42', [4, 5, 6],
        new Map([[4, 0], [5, null], [6, 2]])
      )
    })

    expect(outcome).toEqual({ verified: [4, 6], firstEmpty: 5 })
    expect(api.setCheck).toHaveBeenCalledTimes(2)
    expect(result.current.getStatus('K1M_BR1', '42', 5, null)).toBe('plain')
  })

  it('keeps the gates that succeeded when one write in a section fails', async () => {
    const { result } = await renderLoaded()
    vi.mocked(api.setCheck)
      .mockResolvedValueOnce({ checkedAt: 't', value: 0 })
      .mockRejectedValueOnce(new ApiRequestError('boom', 500))

    await act(async () => {
      await result.current.verifySection(
        'K1M_BR1', '42', [4, 6], new Map([[4, 0], [6, 2]])
      )
    })

    expect(result.current.getStatus('K1M_BR1', '42', 4, 0)).toBe('verified')
    expect(result.current.getStatus('K1M_BR1', '42', 6, 2)).toBe('plain')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/hooks/useChecks.test.ts`
Expected: FAIL — `verifyGate is not a function`.

- [ ] **Step 3: Implement the mutations inside `useChecks`**

```ts
  const writeCheckLocally = useCallback(
    (raceId: string, bib: string, gate: number, check: CheckEntry | null) => {
      setRaces((prev) => {
        const race = prev[raceId] ?? EMPTY_RACE_CHECKS
        const checks = { ...race.checks }
        const key = createGateKey(bib, gate)
        if (check) checks[key] = check
        else delete checks[key]
        return { ...prev, [raceId]: { checks, flags: race.flags ?? [] } }
      })
    },
    []
  )

  const verifyGate = useCallback(
    async (raceId: string, bib: string, gate: number, liveValue: number | null): Promise<boolean> => {
      // Rule 3: an empty gate carries nothing to verify against the paper.
      if (liveValue === null) return false

      const key = createGateKey(bib, gate)
      const previous = races[raceId]?.checks?.[key] ?? null
      writeCheckLocally(raceId, bib, gate, { checkedAt: new Date().toISOString(), value: liveValue })

      try {
        const check = await setCheck(raceId, bib, gate, liveValue)
        writeCheckLocally(raceId, bib, gate, check)
        return true
      } catch {
        writeCheckLocally(raceId, bib, gate, previous)
        return false
      }
    },
    [races, writeCheckLocally]
  )

  const unverifyGate = useCallback(
    async (raceId: string, bib: string, gate: number): Promise<boolean> => {
      const key = createGateKey(bib, gate)
      const previous = races[raceId]?.checks?.[key] ?? null
      writeCheckLocally(raceId, bib, gate, null)

      try {
        await removeCheck(raceId, bib, gate)
        return true
      } catch {
        writeCheckLocally(raceId, bib, gate, previous)
        return false
      }
    },
    [races, writeCheckLocally]
  )

  const toggleGate = useCallback(
    (raceId: string, bib: string, gate: number, liveValue: number | null): Promise<boolean> => {
      const check = races[raceId]?.checks?.[createGateKey(bib, gate)]
      return check ? unverifyGate(raceId, bib, gate) : verifyGate(raceId, bib, gate, liveValue)
    },
    [races, verifyGate, unverifyGate]
  )

  const verifySection = useCallback(
    async (
      raceId: string,
      bib: string,
      gates: number[],
      liveValues: Map<number, number | null>
    ): Promise<{ verified: number[]; firstEmpty: number | null }> => {
      let firstEmpty: number | null = null
      const candidates: number[] = []

      for (const gate of gates) {
        const value = liveValues.get(gate) ?? null
        if (value === null) {
          if (firstEmpty === null) firstEmpty = gate
          continue
        }
        candidates.push(gate)
      }

      // One request per gate: batch writes are out of scope by decision, and
      // a partial section simply reads as incomplete.
      const outcomes = await Promise.all(
        candidates.map((gate) => verifyGate(raceId, bib, gate, liveValues.get(gate) ?? null))
      )

      return {
        verified: candidates.filter((_, index) => outcomes[index]),
        firstEmpty,
      }
    },
    [verifyGate]
  )
```

Add all five to the returned object and its `useMemo` dependency list. Import `setCheck`, `removeCheck` and the `CheckEntry` type at the top.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/hooks/useChecks.test.ts`
Expected: PASS, 20 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useChecks.ts src/hooks/useChecks.test.ts
git commit -m "feat: add optimistic check mutations with rollback"
```

---

### Task 7: Cell visuals — hatching, stale, flag

Visual work. There is no unit test for "does this look right"; the gate is a Playwright screenshot and your own eyes.

**Files:**
- Modify: `src/components/ResultsGrid/ResultsGrid.module.css`
- Modify: `src/components/ResultsGrid/ResultsGrid.tsx:100-140` (the cell component), `:131-140` (props)

**Interfaces:**
- Consumes: `GateCheckStatus` (Task 2)
- Produces: `ResultsGridProps.getGateStatus?: (bib: string, gate: number) => GateCheckStatus`

- [ ] **Step 1: Add the CSS**

Append to `ResultsGrid.module.css`. Hatching is a repeating gradient so it costs no assets and scales with the cell:

```css
/* ==========================================================================
   VERIFICATION STATE
   Value stays legible through every state — that is the binding constraint.
   Precedence: flagged > stale > verified > plain.
   ========================================================================== */

.verified {
  background-image: repeating-linear-gradient(
    45deg,
    var(--color-success-subtle) 0,
    var(--color-success-subtle) 2px,
    transparent 2px,
    transparent 6px
  );
}

.stale {
  background-image: repeating-linear-gradient(
    45deg,
    var(--color-warning-subtle) 0,
    var(--color-warning-subtle) 2px,
    transparent 2px,
    transparent 10px
  );
  box-shadow: inset 0 -2px 0 var(--color-warning);
}

.flagged {
  background: var(--color-error-subtle);
  box-shadow: inset 0 0 0 2px var(--color-error);
  font-weight: var(--font-semibold);
}

@media (prefers-reduced-motion: no-preference) {
  .flagged {
    animation: flagPulse 2s ease-in-out 3;
  }
}

@keyframes flagPulse {
  50% { box-shadow: inset 0 0 0 2px var(--color-error), 0 0 0 1px var(--color-error); }
}
```

These token names are **verified to exist** in `node_modules/@opencanoetiming/timing-design-system`: `--color-success-subtle`, `--color-warning-subtle`, `--color-warning`, `--color-error-subtle`, `--color-error`, `--color-border`, `--color-accent`, `--font-semibold`. There is no `--color-danger*` in this design system — an earlier revision of this plan used that name and it does not resolve. Never invent a hex value; if you need a token not listed above, grep the package for the real name first.

- [ ] **Step 2: Apply the class in the cell**

Add `getGateStatus` to `ResultsGridProps`, thread it to the memoised cell component, and in the cell's className assembly (next to the existing `isBoundary` handling around `:582`):

```tsx
const status = getGateStatus?.(row.bib, gate) ?? 'plain'
if (status !== 'plain') className += ` ${styles[status]}`
```

- [ ] **Step 3: Verify by eye against real data**

Run: `./scripts/take-screenshots.sh`
Open the produced grid screenshots. Check: penalty digits readable through hatching in light and dark; verified regions distinguishable from plain **when you lean back from the screen**; flagged cells findable in under a second on a full grid.

If hatching at full density is oppressive once a race is fully checked, reduce contrast — not the pattern. The spec calls this out as the thing to watch.

- [ ] **Step 4: Commit**

```bash
git add src/components/ResultsGrid/ResultsGrid.tsx src/components/ResultsGrid/ResultsGrid.module.css docs/screenshots
git commit -m "feat: render penalty verification state in the grid"
```

---

### Task 8: Keyboard and the section control

**Files:**
- Modify: `src/components/ResultsGrid/ResultsGrid.tsx`
- Modify: `src/components/ResultsGrid/ResultsGrid.module.css`
- Test: `src/components/ResultsGrid/ResultsGrid.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `toggleGate`, `verifySection` (Task 6)
- Produces: `ResultsGridProps.onToggleCheck?: (bib: string, gate: number) => void`, `ResultsGridProps.onVerifySection?: (bib: string, gates: number[]) => void`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultsGrid } from './ResultsGrid'

// Build props with one competitor and six gates; reuse the fixture helper the
// existing grid tests use if one is already present in this directory.

it('toggles a check on Space', () => {
  const onToggleCheck = vi.fn()
  renderGrid({ onToggleCheck })

  const cell = screen.getAllByRole('gridcell')[0]
  fireEvent.click(cell)
  fireEvent.keyDown(document, { key: ' ' })

  expect(onToggleCheck).toHaveBeenCalledWith('42', 1)
})

it('verifies the whole section on Shift+Space', () => {
  const onVerifySection = vi.fn()
  renderGrid({ onVerifySection, activeGateGroup: { id: 'g1', name: 'A', gates: [1, 2, 3] } })

  fireEvent.click(screen.getAllByRole('gridcell')[0])
  fireEvent.keyDown(document, { key: ' ', shiftKey: true })

  expect(onVerifySection).toHaveBeenCalledWith('42', [1, 2, 3])
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/ResultsGrid/ResultsGrid.test.tsx`
Expected: FAIL — callbacks not called.

- [ ] **Step 3: Implement the key handling**

In the grid's existing `keydown` handler, before the digit shortcuts:

```tsx
if (event.key === ' ') {
  event.preventDefault()
  const row = sortedRows[focusedCell.row]
  const gate = visibleGateIndices[focusedCell.col] + 1
  if (event.shiftKey) {
    onVerifySection?.(row.bib, sectionGatesFor(gate))
  } else {
    onToggleCheck?.(row.bib, gate)
  }
  return
}
```

`sectionGatesFor(gate)` returns the gates of the group containing `gate` from `allGateGroups`, or `[gate]` when no group covers it — rule 1 says the feature must work with no groups defined.

- [ ] **Step 4: Add the section control**

Widen the existing boundary and make it hit-testable. In `ResultsGrid.module.css`, replace the `border-right` on `.boundary` inside body rows (leave the header rule at `:141` alone):

```css
.cellBoundary {
  border-right: 12px solid var(--color-border);
  cursor: pointer;
}

.cellBoundary:hover {
  border-right-color: var(--color-accent);
}
```

Bind `onClick` on that border region to `onVerifySection(row.bib, sectionGatesFor(gate))`. Give it `title` and `aria-label` naming the section so it is not a mystery target.

- [ ] **Step 5: Run tests and check width**

Run: `npx vitest run src/components/ResultsGrid/ResultsGrid.test.tsx && npm test`
Expected: PASS.

Then measure: load the app at 1024px with a 24-gate race and confirm the grid's scroll width grew by no more than ~50px versus `main`. If it grew more, the boundary is being applied to cells that are not section ends.

- [ ] **Step 6: Commit**

```bash
git add src/components/ResultsGrid/ResultsGrid.tsx src/components/ResultsGrid/ResultsGrid.module.css src/components/ResultsGrid/ResultsGrid.test.tsx
git commit -m "feat: verify gates and sections from keyboard and row control"
```

---

### Task 9: Context menu actions and the flag dialog

**Files:**
- Modify: `src/components/ResultsGrid/PenaltyContextMenu.tsx`
- Create: `src/components/FlagDialog/FlagDialog.tsx`, `FlagDialog.module.css`, `index.ts`
- Modify: `src/components/index.ts`
- Test: `src/components/ResultsGrid/PenaltyContextMenu.test.tsx`

**Interfaces:**
- Consumes: `GateCheckStatus`, `FlagEntry`
- Produces:
  - `PenaltyContextMenuProps.checkStatus: GateCheckStatus`
  - `PenaltyContextMenuProps.canVerify: boolean`
  - `PenaltyContextMenuProps.openFlag: FlagEntry | null`
  - `PenaltyContextMenuProps.onToggleCheck: () => void`
  - `PenaltyContextMenuProps.onVerifySection: () => void`
  - `PenaltyContextMenuProps.onAddFlag: () => void`
  - `PenaltyContextMenuProps.onResolveFlag: (flag: FlagEntry) => void`
  - `FlagDialogProps { mode: 'create' | 'resolve'; flag?: FlagEntry; onSubmit: (input: { comment?: string; suggestedValue?: number | null; resolution?: string }) => void; onClose: () => void }`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PenaltyContextMenu } from './PenaltyContextMenu'

const base = {
  x: 0, y: 0, currentValue: 2 as const, onSelect: vi.fn(), onClose: vi.fn(),
  checkStatus: 'plain' as const, canVerify: true, openFlag: null,
  onToggleCheck: vi.fn(), onVerifySection: vi.fn(),
  onAddFlag: vi.fn(), onResolveFlag: vi.fn(),
}

it('offers Verify on an unverified gate', () => {
  render(<PenaltyContextMenu {...base} />)
  expect(screen.getByText('Verify gate')).toBeInTheDocument()
})

it('offers Un-verify on a verified gate', () => {
  render(<PenaltyContextMenu {...base} checkStatus="verified" />)
  expect(screen.getByText('Un-verify gate')).toBeInTheDocument()
})

it('disables Verify on an empty gate', () => {
  render(<PenaltyContextMenu {...base} currentValue={null} canVerify={false} />)
  expect(screen.getByRole('menuitem', { name: /Verify gate/ })).toBeDisabled()
})

it('offers Resolve instead of Add when a flag is open', () => {
  const flag = { id: 'f1', bib: '42', gate: 3, createdAt: 't', comment: 'c', resolved: false }
  render(<PenaltyContextMenu {...base} openFlag={flag} />)
  expect(screen.getByText('Resolve flag…')).toBeInTheDocument()
  expect(screen.queryByText('Add flag…')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/ResultsGrid/PenaltyContextMenu.test.tsx`
Expected: FAIL — the labels do not exist.

- [ ] **Step 3: Extend the menu**

Keep `MENU_OPTIONS` as-is and render a second group below a separator:

```tsx
const isVerified = checkStatus === 'verified' || checkStatus === 'stale'

<div className={styles.separator} role="separator" />

<button
  className={styles.menuItem}
  onClick={() => { onToggleCheck(); onClose() }}
  disabled={!canVerify && !isVerified}
  title={!canVerify && !isVerified ? 'Enter a penalty value first' : undefined}
  role="menuitem"
>
  <span className={styles.menuItemLabel}>{isVerified ? 'Un-verify gate' : 'Verify gate'}</span>
  <span className={styles.menuItemShortcut}>Space</span>
</button>

<button className={styles.menuItem} onClick={() => { onVerifySection(); onClose() }} role="menuitem">
  <span className={styles.menuItemLabel}>Verify section</span>
  <span className={styles.menuItemShortcut}>⇧Space</span>
</button>

{openFlag ? (
  <button className={styles.menuItem} onClick={() => { onResolveFlag(openFlag); onClose() }} role="menuitem">
    <span className={styles.menuItemLabel}>Resolve flag…</span>
  </button>
) : (
  <button className={styles.menuItem} onClick={() => { onAddFlag(); onClose() }} role="menuitem">
    <span className={styles.menuItemLabel}>Add flag…</span>
  </button>
)}
```

Add `.separator` and `.menuItem:disabled` styling to `PenaltyContextMenu.module.css`.

- [ ] **Step 4: Build the flag dialog**

`FlagDialog.tsx`: create mode has a **required** comment field and an optional suggested-value selector (0 / 2 / 50 / none); resolve mode shows the flag's comment and suggested value read-only plus an optional resolution note. Submit is disabled while a required comment is empty. Use the design system's modal, button and input components — no inline styles. Follow the focus-trap pattern already used by `GateGroupEditor` (`src/hooks/useFocusTrap.ts`).

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ResultsGrid/PenaltyContextMenu.tsx src/components/ResultsGrid/PenaltyContextMenu.module.css src/components/ResultsGrid/PenaltyContextMenu.test.tsx src/components/FlagDialog src/components/index.ts
git commit -m "feat: add verification and flag actions to the cell context menu"
```

---

### Task 10: Per-race indicator in the race switcher

**Files:**
- Modify: `src/components/RaceSelector/RaceSelector.tsx`
- Test: `src/components/RaceSelector/RaceSelector.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `getRaceProgress` (Task 5)
- Produces: `RaceSelectorProps.getRaceCheckState?: (raceId: string) => { checked: number; total: number; done: boolean }`

- [ ] **Step 1: Write the failing test**

```tsx
it('marks a fully verified race as done', () => {
  render(<RaceSelector {...props} getRaceCheckState={() => ({ checked: 8, total: 8, done: true })} />)
  expect(screen.getByLabelText(/verified/i)).toBeInTheDocument()
})

it('shows progress while a race is partly verified', () => {
  render(<RaceSelector {...props} getRaceCheckState={() => ({ checked: 3, total: 8, done: false })} />)
  expect(screen.getByText('3/8')).toBeInTheDocument()
})

it('shows nothing when there is nothing to verify yet', () => {
  render(<RaceSelector {...props} getRaceCheckState={() => ({ checked: 0, total: 0, done: false })} />)
  expect(screen.queryByText('0/0')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/RaceSelector/RaceSelector.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Render next to each race name: nothing when `total === 0`, `checked/total` while in progress, and a checkmark with `aria-label="verified"` when `done`. The indicator clears itself when a new finisher grows the denominator — that is the intended behaviour, no extra bookkeeping.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/RaceSelector/RaceSelector.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/RaceSelector src/components/RaceSelector/RaceSelector.test.tsx
git commit -m "feat: show per-race verification state in the race switcher"
```

---

### Task 11: Wire it together and retire the dead hook

**Files:**
- Modify: `src/App.tsx:276-293` (progress path), plus grid and selector wiring
- Delete: `src/hooks/useCheckedState.ts`, `src/hooks/useCheckedState.test.ts`
- Modify: `src/hooks/index.ts:32-35`, `src/types/scoring.ts:71-90` (drop `CheckedState`, `createCheckedKey`)

- [ ] **Step 1: Wire `useChecks` into `App.tsx`**

```tsx
const checks = useChecks({ enabled: connectionState === 'connected' })
```

Pass `checks.applyCheckEvent` / `checks.applyFlagEvent` into `useC123WebSocket` as `onChecksChanged` / `onFlagChanged`. Pass `getGateStatus`, `onToggleCheck`, `onVerifySection` to `ResultsGrid`, and `getRaceCheckState` to the header's race selector.

`onToggleCheck` must read the live gate value from the current results row and pass it through — the hook needs it for both the empty-gate rule and the snapshot.

- [ ] **Step 2: Implement correction-verifies (rule 4)**

Extend the existing `handlePenaltySubmit` at `App.tsx:312`:

```tsx
const handlePenaltySubmit = useCallback(
  async (bib: string, gate: number, value: PenaltyValue, raceId?: string) => {
    const ok = await setGatePenalty(bib, gate, value, raceId)
    // The server's invalidation hook drops the check during the scoring write,
    // so the check must be set after it, never before — and only for a value
    // that exists, per rule 3.
    if (ok && value !== null && raceId && checks.available) {
      await checks.verifyGate(raceId, bib, gate, value)
    }
  },
  [setGatePenalty, checks]
)
```

- [ ] **Step 3: Handle an unsupported server**

When `checks.available === false` and the connection is up, render a single unobtrusive notice and pass no verification props to the grid, so cells render plain. Do **not** fall back to localStorage — the spec rejects it.

**Correction to an earlier assumption in this plan.** An earlier revision claimed the notice must distinguish 404 from 503 because 503 meant "no checks file loaded — set an XML path". That is wrong for this route: `handleGetAllChecks` does **not** call `requireChecks`. With no checks file loaded it answers **200** with `{xmlFilename: null, fingerprint: null, races: {}}`. The actionable "set an XML path" text belongs to the mutating routes, which `fetchAllChecks` never touches. Its only 503 is `Checks service not available` when the store is null, which production always initialises.

So the practical cases collapse:

- **Unavailable at all** (404, or the near-impossible 503) — the server predates 0.12.0. Say: "Verification needs c123-server 0.12.0 or newer."
- **"No checks file loaded"** arrives as `available: true` with `races: {}` and is **indistinguishable from "loaded, nothing verified yet"** through this hook. Do not attempt to tell them apart here; showing an empty grid with everything unverified is the honest rendering of both.

Still use `checks.unavailableReason` for the message — it carries the server's own text when there is one, and the class message otherwise — but do not branch the instruction on its status code.

- [ ] **Step 4: Delete the dead hook**

```bash
git rm src/hooks/useCheckedState.ts src/hooks/useCheckedState.test.ts
```

Remove its exports from `src/hooks/index.ts` and the now-unused `CheckedState` / `createCheckedKey` from `src/types/scoring.ts`. Keep `CheckProgress` — `CheckProgress.tsx` still uses it.

- [ ] **Step 5: Verify nothing dangles**

Run: `npx tsc -b --noEmit && npm run lint && npm test`
Expected: no errors, no unresolved imports, full suite green.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/hooks/index.ts src/types/scoring.ts
git commit -m "feat: wire penalty verification into the app and drop the dead hook"
```

---

### Task 12: End-to-end verification against a recording

**Files:**
- Modify: `tests/screenshots-with-data.spec.ts`
- Modify: `PROJECT.md`, `DEVLOG.md`

- [ ] **Step 1: Add a screenshot scenario**

Extend `tests/screenshots-with-data.spec.ts` with a pass that verifies a few gates and one section, creates a flag, and captures the grid — so all four cell states appear in one image.

- [ ] **Step 2: Run the full pipeline**

Run: `./scripts/take-screenshots.sh`
Expected: replay + c123-server (0.12.0+) + dev server + Playwright all succeed; new screenshots land in the screenshots directory.

- [ ] **Step 3: Check the whole flow by hand**

With the replay running: verify a gate with Space, confirm it survives a page reload (proves server persistence); change that penalty and confirm the cell turns stale; correct a penalty and confirm it comes back verified with no extra keystroke; open a second browser tab and confirm a verification made in one appears in the other.

- [ ] **Step 4: Update the docs**

Add the feature to `PROJECT.md`'s feature list. Add a `DEVLOG.md` entry recording that the fingerprint defect and the missing all-races endpoint were found while specifying the frontend and fixed in c123-server before this work started — append only, never edit existing entries.

- [ ] **Step 5: Commit and open the PR**

```bash
git add tests/screenshots-with-data.spec.ts PROJECT.md DEVLOG.md docs/screenshots
git commit -m "test: cover penalty verification with replay screenshots"
git push -u origin feat/4-penalty-checks-workflow
gh pr create --title "feat: advanced penalty checks workflow" --body "Closes #4 ..."
```

The PR body must include the test plan from Step 3 and note the c123-server 0.12.0 requirement.

---

## Self-Review

**Spec coverage.** Rule 1 → Tasks 6, 8 (`sectionGatesFor` falls back to a single gate). Rule 2 → Task 8 (keys, control) and Task 9 (menu). Rule 3 → Task 6 (`verifyGate` refuses `null`; `verifySection` reports `firstEmpty`) and Task 9 (disabled menu item); Task 8 must move focus to `firstEmpty`, wired in Task 11. Rule 4 → Task 11 Step 2. Rule 5 → Task 5 (`getStatus` snapshot comparison) and Task 4 (invalidation events). Rule 6 → Task 9. Rule 7 → Task 5 (`getRaceProgress` skips rows with a status). Rule 8 → Tasks 2, 5 and Task 12 Step 3. Rule 9 → Tasks 5, 10. Width constraint → Task 8 Step 5. Graceful disable → Task 5, Task 11 Step 3. Team-race openness → `number | null` throughout Tasks 2, 5, 6.

**Type consistency.** `createGateKey(bib, gate)` is the only key builder, defined in Task 2 and used in Tasks 5, 6. `GateCheckStatus` values `flagged | stale | verified | plain` are used identically in Tasks 5, 7, 9. `verifyGate` takes `(raceId, bib, gate, liveValue)` in Tasks 6 and 11. `ApiRequestError` is defined once in Task 1 and consumed in Tasks 2, 5, 6.

**Known gap, deliberately left to the implementer:** the exact focus-move on `firstEmpty` after a section verify depends on `useFocusNavigation`'s internal API, which Task 8 touches first. Wire it in Task 11 once the grid's handlers are in place.
