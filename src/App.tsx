import { useState, useEffect, useCallback, useMemo } from 'react'
import { Layout, Header, ResultsGrid, GateGroupEditor, CheckProgress, Settings, EmptyState } from './components'
import { useC123WebSocket } from './hooks/useC123WebSocket'
import { useSchedule } from './hooks/useSchedule'
import { useGateGroups } from './hooks/useGateGroups'
import { useCheckedState } from './hooks/useCheckedState'
import { useSettings } from './hooks/useSettings'
import { useSettingsShortcut } from './hooks/useSettingsShortcut'
import { useScoring } from './hooks/useScoring'
import type { ResultsSortOption } from './types/ui'

const STORAGE_KEY_SELECTED_RACE = 'c123-scoring-selected-race'
const STORAGE_KEY_SORT_BY = 'c123-scoring-sort-by'

function App() {
  // Settings
  const { settings, updateSettings } = useSettings()

  // Scoring API integration
  const {
    setGatePenalty,
    pendingOperations,
    lastError: scoringError,
    clearError: clearScoringError,
  } = useScoring()

  // Pending writes count for footer indicator
  const pendingCount = pendingOperations.size

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false)

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
  } = useC123WebSocket({ url: settings.serverUrl })

  const { activeRaces, runningRace, getRaceById } = useSchedule(schedule)

  // Selected race with localStorage persistence
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SELECTED_RACE)
    } catch {
      return null
    }
  })

  // Sort option with localStorage persistence
  const [sortBy, setSortBy] = useState<ResultsSortOption>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SORT_BY)
      if (stored === 'startOrder' || stored === 'rank' || stored === 'bib') {
        return stored
      }
      return 'rank'
    } catch {
      return 'rank'
    }
  })

  // Persist sort option to localStorage
  // Note: setSortBy kept for future SortSelector integration
  void setSortBy // Silence unused warning temporarily

  // Auto-select running race if nothing selected (computed, not effect)
  const effectiveSelectedRaceId = selectedRaceId ?? runningRace?.raceId ?? null

  // Persist selected race to localStorage
  const handleSelectRace = useCallback((raceId: string) => {
    setSelectedRaceId(raceId)
    try {
      localStorage.setItem(STORAGE_KEY_SELECTED_RACE, raceId)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

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

  // Log scoring errors to console (errors are rare and worth investigating)
  useEffect(() => {
    if (scoringError) {
      console.error('Scoring error:', scoringError.message)
      clearScoringError()
    }
  }, [scoringError, clearScoringError])

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
    async (bib: string, gate: number, value: import('./types/scoring').PenaltyValue) => {
      await setGatePenalty(bib, gate, value)
    },
    [setGatePenalty]
  )

  return (
    <Layout
      header={
        <Header
          races={activeRaces}
          selectedRaceId={effectiveSelectedRaceId}
          onSelectRace={handleSelectRace}
          isConnected={connectionState === 'connected'}
          onOpenSettings={() => setShowSettings(true)}
        />
      }
      footer={
        <div className="footer-content">
          {/* Left: Version and pending writes */}
          <span className="footer-version">
            C123 Scoring v0.1.0 &bull; Open Canoe Timing
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
      {connectionState === 'connecting' ? (
        <EmptyState variant="loading" />
      ) : connectionState === 'disconnected' || connectionState === 'error' ? (
        <EmptyState
          variant="disconnected"
          action={{
            label: 'Open Settings',
            onClick: () => setShowSettings(true),
          }}
        />
      ) : activeRaces.length === 0 ? (
        <EmptyState variant="no-races" />
      ) : !selectedRace ? (
        <EmptyState
          variant="no-races"
          title="Select a race"
          message="Choose a race from the selector above to start scoring."
        />
      ) : !selectedRaceResults || selectedRaceResults.rows.length === 0 ? (
        <EmptyState variant="no-competitors" />
      ) : (
        <ResultsGrid
          rows={selectedRaceResults.rows}
          raceConfig={raceConfig}
          activeGateGroup={activeGroup}
          allGateGroups={allGroups}
          sortBy={sortBy}
          showStartTime={settings.showStartTime}
          onGroupSelect={setActiveGroup}
          onPenaltySubmit={handlePenaltySubmit}
        />
      )}
    </Layout>
  )
}

export default App
