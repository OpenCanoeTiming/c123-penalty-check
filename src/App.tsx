import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@opencanoetiming/timing-design-system'
import { Layout, Header, ConnectionStatus, RaceBar, ResultsGrid, GateGroupSwitcher, GateGroupEditor, CheckProgress, Settings, EmptyState, useToast } from './components'
import { useC123WebSocket } from './hooks/useC123WebSocket'
import { useConnectionStatus } from './hooks/useConnectionStatus'
import { useSchedule } from './hooks/useSchedule'
import { useGateGroups } from './hooks/useGateGroups'
import { useGateGroupShortcuts } from './hooks/useGateGroupShortcuts'
import { useCheckedState } from './hooks/useCheckedState'
import { useSettings } from './hooks/useSettings'
import { useSettingsShortcut } from './hooks/useSettingsShortcut'
import { useScoring } from './hooks/useScoring'

const STORAGE_KEY_SELECTED_RACE = 'c123-scoring-selected-race'

function App() {
  // Settings
  const { settings, updateSettings } = useSettings()

  // Toast notifications
  const { showSuccess, showError } = useToast()

  // Scoring API integration
  const {
    setGatePenalty,
    removeFromCourse: removeFromCourseApi,
    sendTimingImpulse,
    isLoading: isScoringLoading,
    lastError: scoringError,
    clearError: clearScoringError,
  } = useScoring()

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
    serverInfo,
    lastMessageTime,
    lastError,
    schedule,
    results,
    raceConfig,
    connect,
  } = useC123WebSocket({ url: settings.serverUrl })

  const status = useConnectionStatus(
    connectionState,
    serverInfo,
    lastMessageTime,
    lastError
  )

  const { activeRaces, runningRace, getRaceById } = useSchedule(schedule)

  // Selected race with localStorage persistence
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SELECTED_RACE)
    } catch {
      return null
    }
  })

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

  // Gate group keyboard shortcuts (1-9, 0)
  useGateGroupShortcuts({
    groups: allGroups,
    onSelectGroup: setActiveGroup,
    enabled: !showGateGroupEditor && !showSettings, // Disable when modal is open
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
  const {
    isChecked,
    toggleChecked,
    getProgress,
  } = useCheckedState({
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

  // Show scoring errors via toast
  useEffect(() => {
    if (scoringError) {
      showError(`Scoring error: ${scoringError.message}`)
      clearScoringError()
    }
  }, [scoringError, showError, clearScoringError])

  // Handler for penalty submission
  const handlePenaltySubmit = useCallback(
    async (bib: string, gate: number, value: import('./types/scoring').PenaltyValue) => {
      const success = await setGatePenalty(bib, gate, value)
      if (success) {
        showSuccess(`Gate ${gate}: ${value === 0 ? 'Clear' : value === 50 ? 'Miss (50)' : `+${value}`}`)
      }
    },
    [setGatePenalty, showSuccess]
  )

  // Handler for remove from course
  const handleRemoveFromCourse = useCallback(
    async (bib: string, reason: import('./types/scoring').RemoveReason) => {
      const success = await removeFromCourseApi(bib, reason)
      if (success) {
        showSuccess(`Bib ${bib}: ${reason}`)
      }
    },
    [removeFromCourseApi, showSuccess]
  )

  // Handler for manual timing
  const handleTiming = useCallback(
    async (bib: string, position: import('./types/scoring').ChannelPosition) => {
      const success = await sendTimingImpulse(bib, position)
      if (success) {
        showSuccess(`Bib ${bib}: ${position} impulse sent`)
      }
    },
    [sendTimingImpulse, showSuccess]
  )

  // C123 connection status (for enabling/disabling actions)
  const isC123Connected = serverInfo?.c123Connected ?? false

  return (
    <Layout
      header={
        <Header
          connectionStatus={
            <ConnectionStatus status={status} serverUrl={settings.serverUrl} showDetails />
          }
          actions={
            <Button
              variant="ghost"
              icon
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              title="Settings (Ctrl+,)"
            >
              ⚙
            </Button>
          }
        />
      }
      raceBar={
        <RaceBar
          races={activeRaces}
          selectedRaceId={effectiveSelectedRaceId}
          onSelectRace={handleSelectRace}
          selectedRace={selectedRace ?? null}
        />
      }
      toolbar={
        raceConfig && (
          <GateGroupSwitcher
            groups={allGroups}
            activeGroupId={activeGroupId}
            onSelectGroup={setActiveGroup}
            onOpenEditor={() => setShowGateGroupEditor(true)}
            totalGates={raceConfig.nrGates}
          />
        )
      }
      footer={
        <div className="footer-content">
          {/* Left: Version and organization */}
          <span className="footer-version">
            C123 Scoring v0.1.0 &bull; Open Canoe Timing
            {isScoringLoading && (
              <span className="loading-indicator" title="Sending...">
                <span className="loading-spinner" aria-hidden="true" />
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
          isChecked={isChecked}
          onToggleChecked={toggleChecked}
          onPenaltySubmit={handlePenaltySubmit}
          onRemoveFromCourse={handleRemoveFromCourse}
          onTiming={handleTiming}
          isC123Connected={isC123Connected}
        />
      )}
    </Layout>
  )
}

export default App
