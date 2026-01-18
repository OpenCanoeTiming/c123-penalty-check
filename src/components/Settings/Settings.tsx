/**
 * Settings Component
 *
 * Modal panel for configuring application settings using design system components.
 */

import { useState, useCallback } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Input,
  Button,
  Checkbox,
  Kbd,
  Badge,
  Select,
} from '@opencanoetiming/timing-design-system'
import type { GateGroup } from '../../types/ui'
import type { Settings as SettingsType, ThemeMode } from '../../hooks/useSettings'
import './Settings.css'

export interface SettingsProps {
  /** Current settings values */
  settings: SettingsType
  /** Callback when settings change */
  onSettingsChange: (settings: Partial<SettingsType>) => void
  /** Current connection status for testing */
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
  /** Callback to test connection */
  onTestConnection: (url: string) => void
  /** Gate groups for the gate group tab */
  gateGroups?: GateGroup[]
  /** Callback to open gate group editor */
  onOpenGateGroupEditor?: () => void
  /** Callback to close settings */
  onClose: () => void
}

type SettingsTab = 'server' | 'display' | 'keyboard'

export function Settings({
  settings,
  onSettingsChange,
  connectionState,
  onTestConnection,
  gateGroups,
  onOpenGateGroupEditor,
  onClose,
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('server')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  // Local edit state for URL - tracks if user is editing
  const [localServerUrl, setLocalServerUrl] = useState<string | null>(null)

  // Use local edit state if user has edited, otherwise use settings value
  const serverUrl = localServerUrl ?? settings.serverUrl

  // Validate WebSocket URL
  const validateUrl = useCallback((url: string): string | null => {
    if (!url.trim()) {
      return 'Server URL is required'
    }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
        return 'URL must use ws:// or wss:// protocol'
      }
      return null
    } catch {
      return 'Invalid URL format'
    }
  }, [])

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newUrl = e.target.value
      setLocalServerUrl(newUrl)
      setUrlError(validateUrl(newUrl))
    },
    [validateUrl]
  )

  const handleSaveUrl = useCallback(() => {
    const error = validateUrl(serverUrl)
    if (error) {
      setUrlError(error)
      return
    }
    onSettingsChange({ serverUrl })
  }, [serverUrl, validateUrl, onSettingsChange])

  const handleTestConnection = useCallback(() => {
    const error = validateUrl(serverUrl)
    if (error) {
      setUrlError(error)
      return
    }
    setIsTesting(true)
    onTestConnection(serverUrl)
    // Reset testing state after a delay
    setTimeout(() => setIsTesting(false), 2000)
  }, [serverUrl, validateUrl, onTestConnection])

  // Connection status badge
  const getConnectionBadge = () => {
    if (isTesting) {
      return <Badge variant="warning">Testing...</Badge>
    }
    switch (connectionState) {
      case 'connected':
        return <Badge variant="success">Connected</Badge>
      case 'connecting':
        return <Badge variant="warning">Connecting...</Badge>
      case 'error':
        return <Badge variant="error">Error</Badge>
      default:
        return <Badge variant="neutral">Disconnected</Badge>
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="lg"
      data-testid="settings-panel"
    >
      <ModalHeader>
        <ModalTitle>Settings</ModalTitle>
        <ModalClose onClick={onClose} data-testid="settings-close" />
      </ModalHeader>

      <ModalBody className="settings-body">
        <Tabs
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as SettingsTab)}
          variant="underline"
        >
          <TabList>
            <Tab id="server" data-testid="settings-tab-server">Server</Tab>
            <Tab id="display" data-testid="settings-tab-display">Display</Tab>
            <Tab id="keyboard" data-testid="settings-tab-keyboard">Keyboard</Tab>
          </TabList>

          <TabPanels>
            {/* Server Tab */}
            <TabPanel tabId="server">
              <div className="settings-section">
                <h3 className="settings-section-title">Server Connection</h3>

                <div className="form-group">
                  <label htmlFor="server-url" className="form-label">
                    WebSocket URL
                  </label>
                  <div className="settings-input-group">
                    <Input
                      id="server-url"
                      type="text"
                      value={serverUrl}
                      onChange={handleUrlChange}
                      placeholder="ws://localhost:27123/ws"
                      autoComplete="url"
                      error={!!urlError}
                      data-testid="settings-server-url"
                    />
                    {getConnectionBadge()}
                  </div>
                  {urlError && <p className="form-error">{urlError}</p>}
                  <p className="form-hint">
                    Enter the WebSocket URL of the c123-server instance.
                  </p>
                </div>

                <div className="settings-actions">
                  <Button
                    variant="secondary"
                    onClick={handleTestConnection}
                    disabled={!!urlError || isTesting}
                  >
                    Test Connection
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveUrl}
                    disabled={!!urlError || serverUrl === settings.serverUrl}
                  >
                    Save & Reconnect
                  </Button>
                </div>

                {/* Connection History */}
                {settings.serverHistory && settings.serverHistory.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Recent Servers</label>
                    <div className="settings-history">
                      {settings.serverHistory.slice(0, 5).map((url) => (
                        <button
                          key={url}
                          type="button"
                          className="settings-history-item"
                          onClick={() => {
                            setLocalServerUrl(url)
                            setUrlError(null)
                          }}
                        >
                          {url}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabPanel>

            {/* Display Tab */}
            <TabPanel tabId="display">
              <div className="settings-section">
                <h3 className="settings-section-title">Display Options</h3>

                <div className="form-group">
                  <label htmlFor="theme-select" className="form-label">
                    Theme
                  </label>
                  <Select
                    id="theme-select"
                    value={settings.theme ?? 'auto'}
                    onChange={(e) =>
                      onSettingsChange({ theme: e.target.value as ThemeMode })
                    }
                    data-testid="settings-theme-select"
                  >
                    <option value="auto">Auto (System)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </Select>
                  <p className="form-hint">
                    Choose the color theme for the application.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Gate Groups</label>
                  {gateGroups && gateGroups.length > 0 ? (
                    <p className="form-hint">
                      {gateGroups.length} custom group(s) configured.
                    </p>
                  ) : (
                    <p className="form-hint">No custom gate groups configured.</p>
                  )}
                  {onOpenGateGroupEditor && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        onClose()
                        onOpenGateGroupEditor()
                      }}
                    >
                      Edit Gate Groups
                    </Button>
                  )}
                </div>

                <div className="form-group">
                  <Checkbox
                    checked={settings.showFinished ?? true}
                    onChange={(e) =>
                      onSettingsChange({ showFinished: e.target.checked })
                    }
                  >
                    Show finished competitors
                  </Checkbox>
                  <p className="form-hint">
                    Display competitors who have completed their run in the grid.
                  </p>
                </div>

                <div className="form-group">
                  <Checkbox
                    checked={settings.showOnCourse ?? true}
                    onChange={(e) =>
                      onSettingsChange({ showOnCourse: e.target.checked })
                    }
                  >
                    Show on-course competitors
                  </Checkbox>
                  <p className="form-hint">
                    Display competitors who are still racing on the course.
                  </p>
                </div>

                <div className="form-group">
                  <Checkbox
                    checked={settings.showStartTime ?? false}
                    onChange={(e) =>
                      onSettingsChange({ showStartTime: e.target.checked })
                    }
                  >
                    Show start time column
                  </Checkbox>
                  <p className="form-hint">
                    Display the competitor's start time in the results grid.
                  </p>
                </div>
              </div>
            </TabPanel>

            {/* Keyboard Tab */}
            <TabPanel tabId="keyboard">
              <div className="settings-section" data-testid="settings-keyboard-content">
                <h3 className="settings-section-title">Keyboard Shortcuts</h3>

                <div className="shortcuts-list">
                  <div className="shortcuts-group">
                    <h4 className="shortcuts-group-title">Navigation</h4>
                    <Shortcut keys={['Arrow Keys']} description="Move between cells" />
                    <Shortcut keys={['Tab']} description="Move to next cell" />
                    <Shortcut keys={['Shift', 'Tab']} description="Move to previous cell" />
                    <Shortcut keys={['Home']} description="Go to first gate" />
                    <Shortcut keys={['End']} description="Go to last gate" />
                  </div>

                  <div className="shortcuts-group">
                    <h4 className="shortcuts-group-title">Penalty Entry</h4>
                    <Shortcut keys={['0']} description="Clear / 0 penalty" />
                    <Shortcut keys={['2']} description="2s touch penalty" />
                    <Shortcut keys={['5']} description="50s missed gate" />
                    <Shortcut keys={['Delete']} description="Clear penalty" />
                    <Shortcut keys={['Space']} description="Toggle checked status" />
                  </div>

                  <div className="shortcuts-group">
                    <h4 className="shortcuts-group-title">Gate Groups</h4>
                    <Shortcut keys={['1', '-', '9']} description="Switch to group 1-9" />
                    <Shortcut keys={['0']} description="Show all gates" />
                  </div>

                  <div className="shortcuts-group">
                    <h4 className="shortcuts-group-title">General</h4>
                    <Shortcut keys={['Ctrl', ',']} description="Open settings" />
                    <Shortcut keys={['Escape']} description="Close dialog" />
                    <Shortcut keys={['?']} description="Show keyboard help" />
                  </div>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ModalBody>
    </Modal>
  )
}

interface ShortcutProps {
  keys: string[]
  description: string
}

function Shortcut({ keys, description }: ShortcutProps) {
  return (
    <div className="shortcut">
      <div className="shortcut-keys">
        {keys.map((key, i) => (
          <span key={i}>
            <Kbd size="sm">{key}</Kbd>
            {i < keys.length - 1 && <span className="shortcut-plus">+</span>}
          </span>
        ))}
      </div>
      <span className="shortcut-description">{description}</span>
    </div>
  )
}
