/**
 * Hook exports
 */

export { useC123WebSocket, type ConnectionState, type UseC123WebSocketOptions } from './useC123WebSocket'
export { useConnectionStatus, type ConnectionStatus } from './useConnectionStatus'
export { useSchedule, type ProcessedRace, type RaceStatus, type UseScheduleReturn } from './useSchedule'
export {
  useFocusNavigation,
  type FocusPosition,
  type FocusNavigationOptions,
  type FocusNavigationResult,
} from './useFocusNavigation'
export {
  useKeyboardInput,
  type PenaltyValue,
  type PendingEdit,
  type KeyboardInputOptions,
  type KeyboardInputResult,
} from './useKeyboardInput'
export {
  useScoring,
  type PendingOperation,
  type ScoringState,
  type UseScoringReturn,
} from './useScoring'
export {
  useGateGroups,
  type UseGateGroupsOptions,
  type UseGateGroupsReturn,
} from './useGateGroups'
export {
  useGateGroupShortcuts,
  type UseGateGroupShortcutsOptions,
} from './useGateGroupShortcuts'
export {
  useCheckedState,
  type UseCheckedStateOptions,
  type UseCheckedStateReturn,
} from './useCheckedState'
