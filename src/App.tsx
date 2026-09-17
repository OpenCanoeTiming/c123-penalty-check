import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Badge } from '@opencanoetiming/timing-design-system'
import { Layout, Header, ResultsGrid, GateGroupEditor, CheckProgress, Settings, EmptyState, FlagDialog } from './components'
import type { FlagDialogSubmitInput } from './components'
import { useC123WebSocket } from './hooks/useC123WebSocket'
import { useSchedule } from './hooks/useSchedule'
import { useGateGroups } from './hooks/useGateGroups'
import { useChecks } from './hooks/useChecks'
import { useSettings } from './hooks/useSettings'
import { useSettingsShortcut } from './hooks/useSettingsShortcut'
import { useScoring } from './hooks/useScoring'
import { useServerDiscovery } from './hooks/useServerDiscovery'
import { setApiBaseUrl, wsToHttpUrl } from './services/serverConfig'
import { saveToCache } from './services/discovery-client'
import { fetchScheduleEnrichment } from './services/scheduleApi'
import { fetchCourses, type CourseConfig } from './services/coursesApi'
import { fetchRaceResults } from './services/resultsApi'
import { createFlag, resolveFlag } from './services/checksApi'
import { describeApiError } from './services/http'
import { parseResultsGatesString, pickVerificationProps, submitPenaltyAndVerify } from './utils'
import type { CheckChangedEvent, FlagChangedEvent, FlagEntry, GateCheckStatus } from './types/checks'

/** What the flag dialog is open for: a new flag on a gate, or an existing one to close out. */
type FlagDialogTarget =
  | { mode: 'create'; raceId: string; bib: string; gate: number }
  | { mode: 'resolve'; raceId: string; flag: FlagEntry }

/**
 * The open flag dialog, or null when there is none.
 *
 * Target, in-flight marker and last failure are one state object rather than
 * three separate ones on purpose. A submit is not cancelled when the operator
 * closes the dialog out from under it - fetchWithRetry can still be mid-retry
 * for seconds - so when the request finally settles it has to prove it is
 * still about the dialog on screen before touching anything, or a failure
 * from a flag already dismissed lands on whichever flag was opened next.
 * `target`'s own object identity answers that (a fresh object per open),
 * checked inside the state updater, which needs no generation counter kept in
 * sync alongside - and, unlike a ref, is readable during render.
 */
interface FlagDialogState {
  target: FlagDialogTarget
  error: string | null
  submitting: boolean
}

const STORAGE_KEY_SELECTED_RACE = 'c123-penalty-check-selected-race'

// View state types for main content area
type ViewState =
  | { type: 'loading' }
  | { type: 'disconnected' }
  | { type: 'no-races' }
  | { type: 'select-race' }
  | { type: 'no-competitors' }
  | { type: 'loading-config' }
  | { type: 'grid' }

// Determine which view state to show based on connection and data
function getViewState(
  connectionState: string,
  activeRacesCount: number,
  selectedRace: unknown,
  selectedRaceResults: { rows: unknown[] } | undefined,
  raceConfig: unknown
): ViewState {
  if (connectionState === 'connecting') return { type: 'loading' }
  if (connectionState === 'disconnected' || connectionState === 'error') return { type: 'disconnected' }
  if (activeRacesCount === 0) return { type: 'no-races' }
  if (!selectedRace) return { type: 'select-race' }
  if (!selectedRaceResults || selectedRaceResults.rows.length === 0) return { type: 'no-competitors' }
  if (!raceConfig) return { type: 'loading-config' }
  return { type: 'grid' }
}

function App() {
  const { settings, updateSettings } = useSettings()
  const discovery = useServerDiscovery({ serverUrl: settings.serverUrl })
  const discoveryDone = discovery.status !== 'discovering'
  const [showSettingsFromDiscovery, setShowSettingsFromDiscovery] = useState(false)

  // Handle discovery result
  useEffect(() => {
    if (discovery.status === 'discovering') return

    if (discovery.status === 'found' && discovery.httpBaseUrl && discovery.wsUrl) {
      setApiBaseUrl(discovery.httpBaseUrl)
      saveToCache(discovery.httpBaseUrl)
      if (settings.serverUrl !== discovery.wsUrl) {
        updateSettings({ serverUrl: discovery.wsUrl })
      }
    } else {
      // not-found: use existing settings
      const httpUrl = wsToHttpUrl(settings.serverUrl)
      setApiBaseUrl(httpUrl)
    }
  }, [discovery.status, discovery.httpBaseUrl, discovery.wsUrl, settings.serverUrl, updateSettings])

  if (!discoveryDone) {
    return (
      <EmptyState
        variant="discovering"
        action={
          showSettingsFromDiscovery
            ? undefined
            : {
                label: 'Open Settings',
                onClick: () => setShowSettingsFromDiscovery(true),
              }
        }
      />
    )
  }

  return (
    <AppContent
      settings={settings}
      updateSettings={updateSettings}
      openSettingsOnMount={showSettingsFromDiscovery}
    />
  )
}

interface AppContentProps {
  settings: ReturnType<typeof useSettings>['settings']
  updateSettings: ReturnType<typeof useSettings>['updateSettings']
  openSettingsOnMount?: boolean
}

// Named export for testing: renders with settings supplied directly as
// props, bypassing the server-discovery gate `App` wraps it in.
export function AppContent({ settings, updateSettings, openSettingsOnMount }: AppContentProps) {
  // Scoring API integration
  const {
    setGatePenalty,
    pendingOperations,
  } = useScoring()

  // Pending writes count for footer indicator
  const pendingCount = pendingOperations.size

  // Settings modal state
  const [showSettings, setShowSettings] = useState(openSettingsOnMount ?? false)

  // Gate group editor state
  const [showGateGroupEditor, setShowGateGroupEditor] = useState(false)

  // Settings keyboard shortcut (Ctrl+,)
  useSettingsShortcut({
    onOpenSettings: () => setShowSettings(true),
    enabled: !showSettings && !showGateGroupEditor,
  })

  // useChecks needs the connectionState useC123WebSocket produces, but
  // useC123WebSocket needs checks.applyCheckEvent/applyFlagEvent as
  // callbacks - a real cycle within one render. Refs break it: these two
  // wrapper callbacks have stable identity forever, so useC123WebSocket only
  // ever wires them up once, while the refs themselves are kept pointing at
  // checks' latest (also stable) handlers once `checks` exists below.
  const applyCheckEventRef = useRef<(event: CheckChangedEvent) => void>(() => {})
  const applyFlagEventRef = useRef<(event: FlagChangedEvent) => void>(() => {})
  const handleChecksChanged = useCallback(
    (event: CheckChangedEvent) => applyCheckEventRef.current(event),
    []
  )
  const handleFlagChanged = useCallback(
    (event: FlagChangedEvent) => applyFlagEventRef.current(event),
    []
  )

  const {
    connectionState,
    schedule,
    results,
    raceConfig,
    connect,
  } = useC123WebSocket({
    url: settings.serverUrl,
    clientId: settings.clientId,
    onChecksChanged: handleChecksChanged,
    onFlagChanged: handleFlagChanged,
  })

  // Penalty verification state - event-wide, loaded once the server
  // connection is up.
  const checks = useChecks({ enabled: connectionState === 'connected' })

  useEffect(() => {
    applyCheckEventRef.current = checks.applyCheckEvent
    applyFlagEventRef.current = checks.applyFlagEvent
  }, [checks.applyCheckEvent, checks.applyFlagEvent])

  // REST API state
  const [dateMap, setDateMap] = useState<Map<string, string>>(new Map())
  const [courseNrMap, setCourseNrMap] = useState<Map<string, number>>(new Map())
  const [coursesMap, setCoursesMap] = useState<Map<number, CourseConfig>>(new Map())
  const [restResults, setRestResults] = useState<Map<string, import('./types/c123server').C123ResultsData>>(new Map())

  // Fetch schedule enrichment + courses from REST API when connected
  useEffect(() => {
    if (connectionState !== 'connected') return
    let cancelled = false
    Promise.all([fetchScheduleEnrichment(), fetchCourses()]).then(([enrichment, courses]) => {
      if (cancelled) return
      // Clear stale REST results from previous connection
      setRestResults(new Map())
      if (enrichment.dateMap.size > 0) setDateMap(enrichment.dateMap)
      if (enrichment.courseNrMap.size > 0) setCourseNrMap(enrichment.courseNrMap)
      if (courses.size > 0) setCoursesMap(courses)
    })
    return () => { cancelled = true }
  }, [connectionState])

  const { races, runningRace, getRaceById } = useSchedule(schedule, dateMap, courseNrMap)

  // Selected race with localStorage persistence
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SELECTED_RACE)
    } catch {
      return null
    }
  })

  // Auto-select running race, but respect explicit user selection
  const [hasUserSelected, setHasUserSelected] = useState(false)
  const effectiveSelectedRaceId = useMemo(() => {
    if (hasUserSelected && selectedRaceId) return selectedRaceId
    if (selectedRaceId && getRaceById(selectedRaceId)) return selectedRaceId
    return runningRace?.raceId ?? null
  }, [hasUserSelected, selectedRaceId, getRaceById, runningRace])

  // Persist selected race to localStorage
  const handleSelectRace = useCallback((raceId: string) => {
    setHasUserSelected(true)
    setSelectedRaceId(raceId)
    try {
      localStorage.setItem(STORAGE_KEY_SELECTED_RACE, raceId)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // "Only running" filter for race selector
  const [onlyRunning, setOnlyRunning] = useState(false)

  const visibleRaces = useMemo(
    () => onlyRunning ? races.filter((r) => r.isRunning) : races,
    [races, onlyRunning]
  )

  const selectedRace = effectiveSelectedRaceId ? getRaceById(effectiveSelectedRaceId) : null

  // Resolve per-race gate config: REST courses as base, WebSocket raceConfig for running race
  const effectiveRaceConfig = useMemo(() => {
    // For running race, prefer WebSocket raceConfig (real-time)
    if (selectedRace?.isRunning && raceConfig) return raceConfig
    // For other races, look up from courses map
    if (selectedRace?.courseNr !== null && selectedRace?.courseNr !== undefined) {
      const course = coursesMap.get(selectedRace.courseNr)
      if (course) {
        return {
          nrSplits: 0,
          nrGates: course.nrGates,
          gateConfig: course.gateConfig,
          gateCaptions: Array.from({ length: course.nrGates }, (_, i) => String(i + 1)).join(','),
        }
      }
    }
    // Fallback to WebSocket raceConfig
    return raceConfig
  }, [selectedRace, raceConfig, coursesMap])

  // Lazy-fetch results from REST when selecting a race without WebSocket data
  useEffect(() => {
    if (!effectiveSelectedRaceId) return
    // Skip if WebSocket already has data
    if (results.has(effectiveSelectedRaceId)) return
    // Skip if REST already fetched
    if (restResults.has(effectiveSelectedRaceId)) return

    let cancelled = false
    fetchRaceResults(effectiveSelectedRaceId).then((data) => {
      if (cancelled || !data) return
      setRestResults((prev) => {
        const next = new Map(prev)
        next.set(effectiveSelectedRaceId, data)
        return next
      })
    })
    return () => { cancelled = true }
  }, [effectiveSelectedRaceId, results, restResults])

  // Get results: WebSocket takes priority, REST as fallback
  const selectedRaceResults = effectiveSelectedRaceId
    ? (results.get(effectiveSelectedRaceId) ?? restResults.get(effectiveSelectedRaceId))
    : undefined

  // Gate groups hook
  const {
    allGroups,
    customGroups,
    activeGroup,
    activeGroupId,
    setActiveGroup,
    addGroup,
    updateGroup,
    removeGroup,
  } = useGateGroups({
    raceConfig: effectiveRaceConfig,
    raceId: effectiveSelectedRaceId,
  })

  // Handler for testing connection from settings
  const handleTestConnection = useCallback(
    (url: string) => {
      // If URL is different from current, we'd need to temporarily connect
      // For now, just trigger a reconnect if same URL
      if (url === settings.serverUrl) {
        connect()
      }
    },
    [settings.serverUrl, connect]
  )

  // Handler for settings change that triggers reconnect
  const handleSettingsChange = useCallback(
    (updates: Parameters<typeof updateSettings>[0]) => {
      updateSettings(updates)
      // If server URL changed, the WebSocket hook will auto-reconnect due to URL change
    },
    [updateSettings]
  )

  // Penalty verification wiring
  // ---------------------------------------------------------------------

  // The live value of a gate, read from the currently selected race's
  // results row - useChecks needs it explicitly for both the empty-gate
  // rule (rule 3) and the check snapshot, since it never trusts a stale
  // value carried in its own state.
  const getLiveGateValue = useCallback(
    (bib: string, gate: number): number | null => {
      const row = selectedRaceResults?.rows.find((r) => r.bib === bib)
      if (!row) return null
      return parseResultsGatesString(row.gates)[gate - 1] ?? null
    },
    [selectedRaceResults]
  )

  const getGateStatus = useCallback(
    (bib: string, gate: number): GateCheckStatus => {
      if (!effectiveSelectedRaceId) return 'plain'
      return checks.getStatus(effectiveSelectedRaceId, bib, gate, getLiveGateValue(bib, gate))
    },
    [effectiveSelectedRaceId, checks, getLiveGateValue]
  )

  const handleToggleCheck = useCallback(
    (bib: string, gate: number) => {
      if (!effectiveSelectedRaceId) return
      void checks.toggleGate(effectiveSelectedRaceId, bib, gate, getLiveGateValue(bib, gate))
    },
    [effectiveSelectedRaceId, checks, getLiveGateValue]
  )

  const handleVerifySection = useCallback(
    (bib: string, gates: number[]) => {
      if (!effectiveSelectedRaceId) return
      const liveValues = new Map(gates.map((gate) => [gate, getLiveGateValue(bib, gate)]))
      void checks.verifySection(effectiveSelectedRaceId, bib, gates, liveValues)
    },
    [effectiveSelectedRaceId, checks, getLiveGateValue]
  )

  const getOpenFlag = useCallback(
    (bib: string, gate: number): FlagEntry | null => {
      if (!effectiveSelectedRaceId) return null
      return checks.getFlags(effectiveSelectedRaceId, bib, gate).find((flag) => !flag.resolved) ?? null
    },
    [effectiveSelectedRaceId, checks]
  )

  // Flag dialog (create/resolve) - a REST call away, not wrapped by
  // useChecks. Its effect reaches the UI the same way a penalty submission
  // does: the server broadcasts FlagChanged to every client (including the
  // one that made the request), and applyFlagEvent folds it in from there -
  // no optimistic update needed here.
  const [flagDialog, setFlagDialog] = useState<FlagDialogState | null>(null)

  const openFlagDialog = useCallback((target: FlagDialogTarget) => {
    setFlagDialog({ target, error: null, submitting: false })
  }, [])

  const handleAddFlag = useCallback(
    (bib: string, gate: number) => {
      if (!effectiveSelectedRaceId) return
      openFlagDialog({ mode: 'create', raceId: effectiveSelectedRaceId, bib, gate })
    },
    [effectiveSelectedRaceId, openFlagDialog]
  )

  const handleResolveFlag = useCallback(
    (flag: FlagEntry) => {
      if (!effectiveSelectedRaceId) return
      openFlagDialog({ mode: 'resolve', raceId: effectiveSelectedRaceId, flag })
    },
    [effectiveSelectedRaceId, openFlagDialog]
  )

  const handleFlagDialogClose = useCallback(() => setFlagDialog(null), [])

  const handleFlagDialogSubmit = useCallback(
    async (input: FlagDialogSubmitInput) => {
      if (!flagDialog || flagDialog.submitting) return
      const { target } = flagDialog

      setFlagDialog((current) =>
        current?.target === target ? { ...current, submitting: true, error: null } : current
      )

      // The outcome is decided here and applied in a single update below,
      // rather than from inside try/catch/finally: the success and failure
      // paths differ only in what they do to the same piece of state, and
      // both have to make the same "is this still the dialog on screen"
      // check first.
      let failure: string | null = null
      try {
        if (target.mode === 'create') {
          await createFlag(target.raceId, target.bib, target.gate, input.comment ?? '', input.suggestedValue)
        } else {
          await resolveFlag(target.raceId, target.flag.id, input.resolution)
        }
      } catch (error) {
        // Kept for the devtools trail; what the operator sees is set below.
        console.error('Failed to submit flag:', error)
        failure = describeApiError(error)
      }

      setFlagDialog((current) => {
        // A different dialog (or none) is on screen: this request lost the
        // race and has nothing left to say. Whatever opened in the meantime
        // owns this state now.
        if (current?.target !== target) return current

        // Stay open and say why. Closing on failure - which is what this
        // used to do, with the reason going only to console.error - is
        // indistinguishable from success to anyone not holding a devtools
        // window: the flag sits exactly where it was and nothing explains
        // it. That is how a server-side CORS gap (no PATCH in
        // Access-Control-Allow-Methods, OpenCanoeTiming/c123-server#162)
        // read on a tablet as "Resolve just does nothing".
        if (failure) return { ...current, submitting: false, error: failure }

        return null
      })
    },
    [flagDialog]
  )

  // Per-race verification progress for the race switcher - only for races
  // whose rows are already in memory (WebSocket or lazily-fetched REST);
  // an unloaded race simply shows no indicator, same as "nothing to verify yet".
  const getRaceCheckState = useCallback(
    (raceId: string) => {
      const raceResults = results.get(raceId) ?? restResults.get(raceId)
      if (!raceResults) return { checked: 0, total: 0, openFlags: 0 }
      const { checked, total, openFlags } = checks.getRaceProgress(raceId, raceResults.rows)
      return { checked, total, openFlags }
    },
    [results, restResults, checks]
  )

  // Footer verification progress for the selected race
  const raceProgress = useMemo(() => {
    if (!effectiveSelectedRaceId || !selectedRaceResults) {
      return { checked: 0, total: 0, openFlags: 0, done: false }
    }
    return checks.getRaceProgress(effectiveSelectedRaceId, selectedRaceResults.rows)
  }, [checks, effectiveSelectedRaceId, selectedRaceResults])

  const footerProgress = useMemo(() => {
    const { checked, total, openFlags } = raceProgress
    return { checked, total, openFlags, percentage: total > 0 ? Math.round((checked / total) * 100) : 0 }
  }, [raceProgress])

  // Apply theme to document element
  // Design system uses .theme-light / .theme-dark classes on :root
  useEffect(() => {
    const theme = settings.theme ?? 'auto'
    const root = document.documentElement

    // Remove any existing theme classes
    root.classList.remove('theme-light', 'theme-dark')

    if (theme !== 'auto') {
      // Set explicit theme class
      root.classList.add(`theme-${theme}`)
    }
    // For 'auto', no class needed - DS uses @media (prefers-color-scheme: dark)
  }, [settings.theme])

  // Handler for penalty submission - the write/verify ordering (rule 4) and
  // the empty-gate guard (rule 3) live in submitPenaltyAndVerify, tested on
  // their own in src/utils/verification.test.ts.
  const handlePenaltySubmit = useCallback(
    (bib: string, gate: number, value: import('./types/scoring').PenaltyValue, raceId?: string) =>
      submitPenaltyAndVerify(bib, gate, value, raceId, {
        setGatePenalty,
        verifyGate: checks.verifyGate,
        checksAvailable: checks.available,
      }),
    [setGatePenalty, checks]
  )

  return (
    <Layout
      header={
        <Header
          races={visibleRaces}
          selectedRaceId={effectiveSelectedRaceId}
          onSelectRace={handleSelectRace}
          isConnected={connectionState === 'connected'}
          onOpenSettings={() => setShowSettings(true)}
          onlyRunning={onlyRunning}
          onToggleOnlyRunning={() => setOnlyRunning((v) => !v)}
          {...pickVerificationProps(checks.available, { getRaceCheckState })}
        />
      }
      footer={
        <div className="footer-content">
          {/* Left: Version and pending writes */}
          <span className="footer-version">
            C123 Penalty Check v1.1.0 &bull; Open Canoe Timing
            {pendingCount > 0 && (
              <span className="pending-writes" title={`${pendingCount} pending write${pendingCount > 1 ? 's' : ''}`}>
                <span className="loading-spinner" aria-hidden="true" />
                <span className="pending-count">{pendingCount}</span>
              </span>
            )}
            {connectionState === 'connected' && !checks.loading && !checks.available && (
              <span className="verification-unavailable">
                <Badge variant="warning">Verification unavailable</Badge>
                {/* The reason is rendered as text, not just a title attribute -
                    a title tooltip never appears on a touch device, and this
                    app is built for a tablet. */}
                <span className="verification-unavailable-reason">
                  {checks.unavailableReason?.message ?? 'This server does not support penalty verification.'}
                </span>
              </span>
            )}
          </span>

          {/* Right: Check progress */}
          {checks.available && (
            <CheckProgress progress={footerProgress} label="Verified" compact />
          )}
        </div>
      }
    >
      {/* Gate Group Editor Modal */}
      {showGateGroupEditor && effectiveRaceConfig && (
        <div className="modal-overlay" onClick={() => setShowGateGroupEditor(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <GateGroupEditor
              totalGates={effectiveRaceConfig.nrGates}
              groups={customGroups}
              activeGroupId={activeGroupId}
              onAddGroup={addGroup}
              onUpdateGroup={updateGroup}
              onRemoveGroup={removeGroup}
              onSetActiveGroup={setActiveGroup}
              onClose={() => setShowGateGroupEditor(false)}
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Settings
          settings={settings}
          onSettingsChange={handleSettingsChange}
          connectionState={connectionState}
          onTestConnection={handleTestConnection}
          gateGroups={customGroups}
          onOpenGateGroupEditor={() => setShowGateGroupEditor(true)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Flag Dialog (create/resolve) */}
      {flagDialog && (
        <FlagDialog
          mode={flagDialog.target.mode}
          flag={flagDialog.target.mode === 'resolve' ? flagDialog.target.flag : undefined}
          error={flagDialog.error}
          submitting={flagDialog.submitting}
          onSubmit={handleFlagDialogSubmit}
          onClose={handleFlagDialogClose}
        />
      )}

      {/* Main content area with empty states */}
      {(() => {
        const viewState = getViewState(
          connectionState,
          races.length,
          selectedRace,
          selectedRaceResults,
          effectiveRaceConfig
        )
        switch (viewState.type) {
          case 'loading':
          case 'loading-config':
            return <EmptyState variant="loading" />
          case 'disconnected':
            return (
              <EmptyState
                variant="disconnected"
                action={{
                  label: 'Open Settings',
                  onClick: () => setShowSettings(true),
                }}
              />
            )
          case 'no-races':
            return <EmptyState variant="no-races" />
          case 'select-race':
            return (
              <EmptyState
                variant="no-races"
                title="Select a race"
                message="Choose a race from the selector above to start scoring."
              />
            )
          case 'no-competitors':
            return <EmptyState variant="no-competitors" />
          case 'grid':
            return (
              <ResultsGrid
                // Key forces remount when gate count changes, ensuring sticky recalculates
                key={`grid-${effectiveRaceConfig?.nrGates ?? 0}`}
                rows={selectedRaceResults!.rows}
                raceConfig={effectiveRaceConfig!}
                raceId={effectiveSelectedRaceId}
                activeGateGroup={activeGroup}
                allGateGroups={allGroups}
                sortBy={settings.sortBy}
                onGroupSelect={setActiveGroup}
                onPenaltySubmit={handlePenaltySubmit}
                {...pickVerificationProps(checks.available, {
                  getGateStatus,
                  onToggleCheck: handleToggleCheck,
                  onVerifySection: handleVerifySection,
                  getOpenFlag,
                  onAddFlag: handleAddFlag,
                  onResolveFlag: handleResolveFlag,
                })}
              />
            )
        }
      })()}
    </Layout>
  )
}

export default App
