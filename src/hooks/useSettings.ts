/**
 * useSettings Hook
 *
 * Central state management for application settings with localStorage persistence.
 */

import { useState, useCallback, useEffect } from 'react'
import type { ResultsSortOption } from '../types/ui'

const STORAGE_KEY = 'c123-scoring-settings'
const DEFAULT_SERVER_URL = 'ws://localhost:27123/ws'
const MAX_HISTORY_LENGTH = 10

export type ThemeMode = 'auto' | 'light' | 'dark'

export interface Settings {
  /** WebSocket server URL */
  serverUrl: string
  /** History of previously used server URLs */
  serverHistory: string[]
  /** Whether to show finished competitors in the grid */
  showFinished: boolean
  /** Whether to show on-course competitors (still racing) in the grid */
  showOnCourse: boolean
  /** Show start time column in grid */
  showStartTime: boolean
  /** Theme mode: auto (system), light, or dark */
  theme: ThemeMode
  /** Sort option for results grid */
  sortBy: ResultsSortOption
}

const DEFAULT_SETTINGS: Settings = {
  serverUrl: DEFAULT_SERVER_URL,
  serverHistory: [],
  showFinished: true,
  showOnCourse: true,
  showStartTime: false,
  theme: 'auto',
  sortBy: 'startOrder',
}

export interface UseSettingsReturn {
  /** Current settings */
  settings: Settings
  /** Update one or more settings */
  updateSettings: (updates: Partial<Settings>) => void
  /** Reset settings to defaults */
  resetSettings: () => void
  /** Add a server URL to history */
  addToServerHistory: (url: string) => void
}

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error)
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.warn('Failed to save settings to localStorage:', error)
  }
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  // Save to localStorage whenever settings change
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates }

      // If serverUrl changed, add old URL to history
      if (updates.serverUrl && updates.serverUrl !== prev.serverUrl) {
        const newHistory = [
          prev.serverUrl,
          ...prev.serverHistory.filter((url) => url !== prev.serverUrl),
        ].slice(0, MAX_HISTORY_LENGTH)
        newSettings.serverHistory = newHistory
      }

      return newSettings
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const addToServerHistory = useCallback((url: string) => {
    setSettings((prev) => {
      if (prev.serverHistory.includes(url)) {
        return prev
      }
      return {
        ...prev,
        serverHistory: [url, ...prev.serverHistory].slice(0, MAX_HISTORY_LENGTH),
      }
    })
  }, [])

  return {
    settings,
    updateSettings,
    resetSettings,
    addToServerHistory,
  }
}
