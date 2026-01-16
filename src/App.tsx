import { useState, useEffect, useCallback, useMemo } from 'react'
import { Layout, Header, ConnectionStatus, RaceSelector, OnCourseGrid, GateGroupSwitcher, GateGroupEditor, CheckProgress, Settings, EmptyState, useToast } from './components'
import { useC123WebSocket } from './hooks/useC123WebSocket'
import { useConnectionStatus } from './hooks/useConnectionStatus'
import { useSchedule } from './hooks/useSchedule'
import { useGateGroups } from './hooks/useGateGroups'
import { useGateGroupShortcuts } from './hooks/useGateGroupShortcuts'
import { useCheckedState } from './hooks/useCheckedState'
import { useSettings } from './hooks/useSettings'
import { useSettingsShortcut } from './hooks/useSettingsShortcut'
import { useScoring } from './hooks/useScoring'
import './App.css'

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
    onCourse,
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

  // Auto-select running race if nothing selected
  useEffect(() => {
    if (!selectedRaceId && runningRace) {
      setSelectedRaceId(runningRace.raceId)
    }
  }, [selectedRaceId, runningRace])

  // Persist selected race to localStorage
  const handleSelectRace = useCallback((raceId: string) => {
    setSelectedRaceId(raceId)
    try {
      localStorage.setItem(STORAGE_KEY_SELECTED_RACE, raceId)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  const selectedRace = selectedRaceId ? getRaceById(selectedRaceId) : null

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
    raceId: selectedRaceId,
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
    raceId: selectedRaceId,
    groupId: activeGroupId,
  })

  // Get list of finished competitor bibs for progress calculation
  const finishedCompetitorBibs = useMemo(() => {
    if (!onCourse?.competitors) return []
    return onCourse.competitors
      .filter((c) => c.completed && c.raceId === selectedRaceId)
      .map((c) => c.bib)
  }, [onCourse?.competitors, selectedRaceId])

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
          raceInfo={selectedRace?.mainTitle}
          connectionStatus={
            <ConnectionStatus status={status} serverUrl={settings.serverUrl} showDetails />
          }
          actions={
            <>
              <RaceSelector
                races={activeRaces}
                selectedRaceId={selectedRaceId}
                onSelectRace={handleSelectRace}
              />
              <button
                className="settings-button"
                onClick={() => setShowSettings(true)}
                aria-label="Settings"
                title="Settings (Ctrl+,)"
              >
                ⚙
              </button>
            </>
          }
        />
      }
      footer={
        <div className="footer-content">
          <span className="footer-version">
            C123 Scoring v0.1.0 &bull; Open Canoe Timing
            {isScoringLoading && (
              <span className="loading-indicator" title="Sending...">
                <span className="loading-spinner" aria-hidden="true" />
              </span>
            )}
          </span>
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
      {/* Gate Group Switcher */}
      {raceConfig && (
        <GateGroupSwitcher
          groups={allGroups}
          activeGroupId={activeGroupId}
          onSelectGroup={setActiveGroup}
          onOpenEditor={() => setShowGateGroupEditor(true)}
        />
      )}

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
      ) : !onCourse || onCourse.competitors.filter(c => c.raceId === selectedRaceId).length === 0 ? (
        <EmptyState variant="no-competitors" />
      ) : (
        <OnCourseGrid
          competitors={onCourse.competitors}
          raceConfig={raceConfig}
          selectedRaceId={selectedRaceId}
          activeGateGroup={activeGroup}
          allGateGroups={allGroups}
          isChecked={isChecked}
          onToggleChecked={toggleChecked}
          showFinished={settings.showFinished}
          showOnCourse={settings.showOnCourse}
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
