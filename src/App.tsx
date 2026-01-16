import { useState, useEffect, useCallback, useMemo } from 'react'
import { Layout, Header, ConnectionStatus, RaceSelector, OnCourseGrid, GateGroupSwitcher, GateGroupEditor, CheckProgress } from './components'
import { useC123WebSocket } from './hooks/useC123WebSocket'
import { useConnectionStatus } from './hooks/useConnectionStatus'
import { useSchedule } from './hooks/useSchedule'
import { useGateGroups } from './hooks/useGateGroups'
import { useGateGroupShortcuts } from './hooks/useGateGroupShortcuts'
import { useCheckedState } from './hooks/useCheckedState'
import './App.css'

const DEFAULT_SERVER_URL = 'ws://localhost:27123/ws'
const STORAGE_KEY_SELECTED_RACE = 'c123-scoring-selected-race'

function App() {
  const serverUrl = DEFAULT_SERVER_URL

  const {
    connectionState,
    serverInfo,
    lastMessageTime,
    lastError,
    schedule,
    onCourse,
    raceConfig,
  } = useC123WebSocket({ url: serverUrl })

  const status = useConnectionStatus(
    connectionState,
    serverInfo,
    lastMessageTime,
    lastError
  )

  const { activeRaces, runningRace, getRaceById } = useSchedule(schedule)

  // Gate group editor state
  const [showGateGroupEditor, setShowGateGroupEditor] = useState(false)

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
    enabled: !showGateGroupEditor, // Disable when editor is open
  })

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

  return (
    <Layout
      header={
        <Header
          raceInfo={selectedRace?.mainTitle}
          connectionStatus={
            <ConnectionStatus status={status} serverUrl={serverUrl} showDetails />
          }
          actions={
            <RaceSelector
              races={activeRaces}
              selectedRaceId={selectedRaceId}
              onSelectRace={handleSelectRace}
            />
          }
        />
      }
      footer={
        <div className="footer-content">
          <span>C123 Scoring v0.1.0 &bull; Open Canoe Timing</span>
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

      {onCourse ? (
        <OnCourseGrid
          competitors={onCourse.competitors}
          raceConfig={raceConfig}
          selectedRaceId={selectedRaceId}
          activeGateGroup={activeGroup}
          allGateGroups={allGroups}
          isChecked={isChecked}
          onToggleChecked={toggleChecked}
        />
      ) : (
        <p className="placeholder">
          {selectedRace
            ? 'Waiting for competitors on course...'
            : 'Select a race to start scoring'}
        </p>
      )}
    </Layout>
  )
}

export default App
