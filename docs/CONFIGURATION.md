# Configuration Examples

This document provides configuration examples for various deployment scenarios.

---

## Overview

C123-scoring uses **localStorage** for all configuration. Settings are persisted automatically and scoped appropriately:

| Setting Type | Storage Key | Scope |
|--------------|-------------|-------|
| App settings | `c123-scoring-settings` | Global |
| Gate groups | `c123-scoring-gate-groups-{raceId}` | Per race |
| Checked state | `c123-scoring-checked-{raceId}` | Per race |
| Selected race | `c123-scoring-selected-race` | Global |

---

## Server Configuration

### Default (localhost)

The app defaults to connecting to c123-server on localhost:

```
ws://localhost:27123/ws
```

Open Settings (Ctrl+,) → Server tab to change.

### Network Server

For connecting to c123-server on another machine:

```
ws://192.168.1.100:27123/ws
```

Replace `192.168.1.100` with your c123-server's IP address.

### Secure WebSocket (WSS)

If c123-server is behind a reverse proxy with TLS:

```
wss://timing.example.com/ws
```

---

## Display Settings

### Default

```json
{
  "showFinished": true,
  "showOnCourse": true,
  "compactMode": false
}
```

### Penalty Verification Mode

For focused verification of finished competitors:

```json
{
  "showFinished": true,
  "showOnCourse": false,
  "compactMode": false
}
```

### High-Density Mode

For displays with many competitors:

```json
{
  "showFinished": true,
  "showOnCourse": true,
  "compactMode": true
}
```

---

## Gate Groups

Gate groups allow segmenting the course for distributed verification by multiple controllers.

### Example: 20-gate course with 3 controllers

**Controller 1 (Gates 1-7):**
```json
{
  "name": "Start section",
  "gates": [1, 2, 3, 4, 5, 6, 7],
  "color": "#3b82f6"
}
```

**Controller 2 (Gates 8-14):**
```json
{
  "name": "Middle section",
  "gates": [8, 9, 10, 11, 12, 13, 14],
  "color": "#10b981"
}
```

**Controller 3 (Gates 15-20):**
```json
{
  "name": "Finish section",
  "gates": [15, 16, 17, 18, 19, 20],
  "color": "#f59e0b"
}
```

### Example: Non-sequential groups

For courses with specific problem areas:

```json
{
  "name": "Reverse gates",
  "gates": [3, 7, 12, 15],
  "color": "#ef4444"
}
```

### Creating Groups via UI

1. Open Settings (Ctrl+,) → Display tab → "Edit Gate Groups"
2. Click "Add Group"
3. Enter name, select gates, choose color
4. Save

### Quick Switching

Use number keys 1-9 to quickly switch between groups, or 0 for all gates.

---

## Keyboard Shortcuts Reference

### Navigation

| Key | Action |
|-----|--------|
| ↑ ↓ ← → | Navigate grid cells |
| Tab | Next row |
| Shift+Tab | Previous row |
| Home | First column (gate 1) |
| End | Last column |
| Page Up | Jump 5 rows up |
| Page Down | Jump 5 rows down |

### Penalty Entry

| Key | Action |
|-----|--------|
| 0 | Clear (no penalty) |
| 2 | Touch (+2 seconds) |
| 5 | Missed gate (+50 seconds) |
| Delete/Backspace | Remove penalty |
| Enter | Confirm pending value |
| Escape | Cancel pending edit |

### Application

| Key | Action |
|-----|--------|
| 1-9 | Switch to gate group 1-9 |
| 0 | Show all gates |
| Ctrl+, | Open settings |
| D | Open competitor actions menu |

---

## Deployment Scenarios

### Scenario 1: Single Station

Standard setup with one scoring terminal.

```
Canoe123 → c123-server → c123-scoring (browser)
```

Configuration:
- Server URL: `ws://localhost:27123/ws`
- Gate groups: Not needed (verify all gates)

### Scenario 2: Multiple Controllers

Three controllers verifying different course sections.

```
Canoe123 → c123-server → c123-scoring (controller 1)
                       → c123-scoring (controller 2)
                       → c123-scoring (controller 3)
```

Configuration per controller:
- Server URL: `ws://<server-ip>:27123/ws` (same for all)
- Gate groups: Different section per controller
- Check progress: Independent per controller

### Scenario 3: Chief Judge + Controllers

Chief judge sees everything, controllers see sections.

**Chief Judge:**
- Server URL: `ws://<server-ip>:27123/ws`
- Gate groups: All gates (no filter)
- Display: All competitors visible

**Controllers:**
- Server URL: `ws://<server-ip>:27123/ws`
- Gate groups: Assigned section only
- Display: Focused on their section

### Scenario 4: Testing/Demo

Using a recorded race replay for testing without live C123.

Terminal 1 (player - emulates C123):
```bash
cd ../c123-protocol-docs
node tools/recordings-cli.js fetch 2026-04-19-jarni-ne-odp
node tools/player.js "$(node tools/recordings-cli.js path 2026-04-19-jarni-ne-odp)" \
  --autoplay --xml-out /tmp/c123-replay.xml
```

Terminal 2 (c123-server):
```bash
cd ../c123-server
npm start -- --host 127.0.0.1 --xml /tmp/c123-replay.xml --no-discovery --no-tray
```

Terminal 3 (c123-penalty-check):
```bash
npm run dev
```

Browser: http://localhost:5173

---

## Troubleshooting

### "Connection failed"

1. Check c123-server is running
2. Verify server URL is correct (ws:// not http://)
3. Check firewall allows port 27123
4. Try "Test Connection" button in Settings

### "Scoring failed"

1. c123-server needs active TCP connection to Canoe123
2. Check c123-server console for TCP status
3. Verify competitor is on course (started, not finished)

### Settings not saving

1. Check browser localStorage is enabled
2. Clear localStorage if corrupted: `localStorage.clear()`
3. Note: Private/incognito mode may not persist

### Gate groups reset

Gate groups are scoped per race. When race changes:
- Groups are loaded from that race's storage
- New race starts with no custom groups
- Create groups again or copy from another race

---

## Advanced: Direct localStorage Access

For debugging or bulk configuration, access localStorage directly in browser DevTools:

```javascript
// View current settings
JSON.parse(localStorage.getItem('c123-scoring-settings'))

// View gate groups for a race
JSON.parse(localStorage.getItem('c123-scoring-gate-groups-K1M_ST_BR1_6'))

// Reset all settings
localStorage.clear()

// Export settings
JSON.stringify(localStorage)

// Import settings (caution: overwrites)
Object.entries(exportedData).forEach(([k, v]) => localStorage.setItem(k, v))
```

---

## See Also

- [README.md](../README.md) - Installation and usage
- [API.md](./API.md) - API reference
- [c123-server documentation](https://github.com/OpenCanoeTiming/c123-server)
