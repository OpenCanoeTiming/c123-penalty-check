/**
 * useSettings Hook
 *
 * Central state management for application settings with localStorage persistence.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ResultsSortOption } from '../types/ui'
import { setApiBaseUrl, wsToHttpUrl } from '../services/serverConfig'
import { saveToCache } from '../services/discovery-client'

const STORAGE_KEY = 'c123-scoring-settings'
const DEFAULT_SERVER_URL = 'ws://localhost:27123/ws'
const MAX_HISTORY_LENGTH = 10
const SAVE_DEBOUNCE_MS = 300

export type ThemeMode = 'auto' | 'light' | 'dark'

export interface Settings {
  /** WebSocket server URL */
  serverUrl: string
  /** History of previously used server URLs */
  serverHistory: string[]
  /** Client identifier sent to server (for distinguishing multiple scoring clients) */
  clientId: string
  /** Theme mode: auto (system), light, or dark */
  theme: ThemeMode
  /** Sort option for results grid */
  sortBy: ResultsSortOption
}

const DEFAULT_SETTINGS: Settings = {
  serverUrl: DEFAULT_SERVER_URL,
  serverHistory: [],
  clientId: 'c123-scoring',
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
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced save to localStorage whenever settings change
  useEffect(() => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      saveSettings(settings)
    }, SAVE_DEBOUNCE_MS)

    // Cleanup on unmount or before next effect
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [settings])

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates }

      // If serverUrl changed, add old URL to history and sync REST API base URL
      if (updates.serverUrl && updates.serverUrl !== prev.serverUrl) {
        const newHistory = [
          prev.serverUrl,
          ...prev.serverHistory.filter((url) => url !== prev.serverUrl),
        ].slice(0, MAX_HISTORY_LENGTH)
        newSettings.serverHistory = newHistory

        // Keep REST APIs in sync with the new server
        const httpUrl = wsToHttpUrl(updates.serverUrl)
        setApiBaseUrl(httpUrl)
        saveToCache(httpUrl)
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
