import { useState, useEffect, useCallback, useMemo } from 'react'
import { Layout, Header, ResultsGrid, GateGroupEditor, CheckProgress, Settings, EmptyState } from './components'
import { useC123WebSocket } from './hooks/useC123WebSocket'
import { useSchedule } from './hooks/useSchedule'
import { useGateGroups } from './hooks/useGateGroups'
import { useCheckedState } from './hooks/useCheckedState'
import { useSettings } from './hooks/useSettings'
import { useSettingsShortcut } from './hooks/useSettingsShortcut'
import { useScoring } from './hooks/useScoring'
import { useServerDiscovery } from './hooks/useServerDiscovery'
import { setApiBaseUrl, wsToHttpUrl } from './services/serverConfig'
import { saveToCache } from './services/discovery-client'
import { fetchScheduleDates } from './services/scheduleApi'

const STORAGE_KEY_SELECTED_RACE = 'c123-scoring-selected-race'

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

function AppContent({ settings, updateSettings, openSettingsOnMount }: AppContentProps) {
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

  const {
    connectionState,
    schedule,
    results,
    raceConfig,
    connect,
  } = useC123WebSocket({
    url: settings.serverUrl,
    clientId: settings.clientId,
  })

  // Fetch schedule dates from REST API when connected
  const [dateMap, setDateMap] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    if (connectionState !== 'connected') return
    let cancelled = false
    fetchScheduleDates().then((map) => {
      if (!cancelled && map.size > 0) setDateMap(map)
    })
    return () => { cancelled = true }
  }, [connectionState])

  const { races, runningRace, getRaceById } = useSchedule(schedule, dateMap)

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

  // Get results data for selected race
  const selectedRaceResults = effectiveSelectedRaceId ? results.get(effectiveSelectedRaceId) : undefined

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
    raceConfig,
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

  // Protocol check state
  const { getProgress } = useCheckedState({
    raceId: effectiveSelectedRaceId,
    groupId: activeGroupId,
  })

  // Get list of finished competitor bibs for progress calculation (from Results)
  const finishedCompetitorBibs = useMemo(() => {
    if (!selectedRaceResults?.rows) return []
    // Results rows without status (DNS/DNF/DSQ) are finished competitors
    return selectedRaceResults.rows
      .filter((r) => !r.status)
      .map((r) => r.bib)
  }, [selectedRaceResults])

  // Calculate check progress
  const checkProgress = useMemo(() => {
    return getProgress(finishedCompetitorBibs)
  }, [getProgress, finishedCompetitorBibs])

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

  // Handler for penalty submission
  const handlePenaltySubmit = useCallback(
    async (bib: string, gate: number, value: import('./types/scoring').PenaltyValue, raceId?: string) => {
      await setGatePenalty(bib, gate, value, raceId)
    },
    [setGatePenalty]
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
          </span>

          {/* Right: Check progress */}
          {finishedCompetitorBibs.length > 0 && (
            <CheckProgress
              progress={checkProgress}
              label={activeGroup ? `${activeGroup.name}` : 'Checked'}
              compact
            />
          )}
        </div>
      }
    >
      {/* Gate Group Editor Modal */}
      {showGateGroupEditor && raceConfig && (
        <div className="modal-overlay" onClick={() => setShowGateGroupEditor(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <GateGroupEditor
              totalGates={raceConfig.nrGates}
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

      {/* Main content area with empty states */}
      {(() => {
        const viewState = getViewState(
          connectionState,
          races.length,
          selectedRace,
          selectedRaceResults,
          raceConfig
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
                key={`grid-${raceConfig?.nrGates ?? 0}`}
                rows={selectedRaceResults!.rows}
                raceConfig={raceConfig!}
                raceId={effectiveSelectedRaceId}
                activeGateGroup={activeGroup}
                allGateGroups={allGroups}
                sortBy={settings.sortBy}
                onGroupSelect={setActiveGroup}
                onPenaltySubmit={handlePenaltySubmit}
              />
            )
        }
      })()}
    </Layout>
  )
}

export default App
