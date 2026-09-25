#!/usr/bin/env node
//
// wait-for-server-data.cjs - Blocks until c123-server has live race data
//
// Usage: node scripts/wait-for-server-data.cjs <ws-url> [timeout-seconds]
//
// Connects the same way the app does and exits 0 once both Schedule and
// Results have arrived - the app needs Schedule for the race selector and
// Results for a grid with judged gates. Exits 1 on timeout or error.
//

const WebSocket = require('ws')

const url = process.argv[2]
const timeoutSec = Number(process.argv[3] || 90)
const REQUIRED = ['Schedule', 'Results']

const seen = new Set()
const ws = new WebSocket(url)

ws.on('message', (raw) => {
  try {
    seen.add(JSON.parse(raw).type)
  } catch {
    return
  }
  if (REQUIRED.every((type) => seen.has(type))) {
    ws.close()
    process.exit(0)
  }
})

ws.on('error', (err) => {
  console.error(`WebSocket error: ${err.message}`)
  process.exit(1)
})

setTimeout(() => {
  console.error(`Timed out after ${timeoutSec}s; received: ${[...seen].join(', ') || 'nothing'}`)
  process.exit(1)
}, timeoutSec * 1000)
