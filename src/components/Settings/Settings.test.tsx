import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Settings, type SettingsProps } from './Settings'

function renderSettings(overrides: Partial<SettingsProps> = {}) {
  const props: SettingsProps = {
    settings: {
      serverUrl: 'ws://127.0.0.1:27123/ws',
      serverHistory: [],
      clientId: 'c123-penalty-check',
      theme: 'auto',
      sortBy: 'startOrder',
    },
    onSettingsChange: vi.fn(),
    connectionState: 'connected',
    onTestConnection: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<Settings {...props} />)
  return props
}

describe('Settings', () => {
  it('is a modal dialog named Settings', () => {
    renderSettings()
    expect(screen.getByRole('dialog', { name: 'Settings' })).toHaveAttribute('aria-modal', 'true')
  })

  it('opens on the Display tab', () => {
    renderSettings()
    expect(screen.getByRole('tab', { name: 'Display' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Theme')).toBeInTheDocument()
  })

  it('switches tabs on click and renders only the active panel', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('tab', { name: 'Keyboard' }))

    expect(screen.getByRole('tab', { name: 'Keyboard' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('settings-keyboard-content')).toBeInTheDocument()
    expect(screen.queryByLabelText('Theme')).not.toBeInTheDocument()
  })

  it('moves between tabs with the arrow keys', () => {
    renderSettings()
    const display = screen.getByRole('tab', { name: 'Display' })

    fireEvent.keyDown(display, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Keyboard' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Keyboard' })).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Keyboard' }), { key: 'ArrowLeft' })
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Display' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: 'Server' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows keys as <kbd>', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('tab', { name: 'Keyboard' }))
    const keys = screen.getAllByText('Escape')
    expect(keys.some((el) => el.tagName === 'KBD')).toBe(true)
  })

  it('closes on Escape and from the close button', () => {
    const props = renderSettings()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Display' }), { key: 'Escape' })
    expect(props.onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(props.onClose).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['connected', 'Connected', 'badge-success'],
    ['connecting', 'Connecting...', 'badge-warning'],
    ['error', 'Error', 'badge-error'],
    ['disconnected', 'Disconnected', 'badge-neutral'],
  ] as const)('shows the %s connection state as a %s badge', (state, text, cls) => {
    renderSettings({ connectionState: state })
    fireEvent.click(screen.getByRole('tab', { name: 'Server' }))
    expect(screen.getByText(text)).toHaveClass('badge', cls)
  })

  it('marks an invalid server URL', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('tab', { name: 'Server' }))
    const input = screen.getByLabelText('WebSocket URL')
    fireEvent.change(input, { target: { value: 'not a url!' } })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter a valid host:port or ws:// URL')).toBeInTheDocument()
  })
})
