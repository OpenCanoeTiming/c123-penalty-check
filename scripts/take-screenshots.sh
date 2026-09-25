#!/bin/bash
#
# take-screenshots.sh - Automated screenshot generation against a replayed race
#
# Usage: ./scripts/take-screenshots.sh [--static-only]
#
# Environment:
#   RECORDING   c123-protocol-docs recording id (default: 2026-04-19-jarni-ne-odp)
#   START_RACE  race to start the replay at (default: K1W_BR1_19 - by then the
#               earlier Sunday races are complete, so grids have judged gates)
#   SPEED       replay speed (default: 1 - keeps the grid stable while
#               screenshots are taken)
#
# This script:
# 1. Runs static screenshot tests (no server - they capture disconnected states)
# 2. Fetches the recording and starts player.js (simulates C123 + XML file)
# 3. Starts c123-server against the player
# 4. Waits until a WebSocket client receives Schedule + Results
# 5. Runs data screenshot tests (Playwright starts or reuses the Vite dev server)
# 6. Cleans up everything it started
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PROTOCOL_DOCS_DIR="$PROJECT_DIR/../c123-protocol-docs"
C123_SERVER_DIR="$PROJECT_DIR/../c123-server"

RECORDING="${RECORDING:-2026-04-19-jarni-ne-odp}"
START_RACE="${START_RACE:-K1W_BR1_19}"
SPEED="${SPEED:-1}"
SERVER_URL="http://127.0.0.1:27123"
C123_PORT=27333
SERVER_PORT=27123

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

LOG_DIR="$(mktemp -d -t penalty-check-screenshots.XXXXXX)"
PLAYER_PGID=""
SERVER_PGID=""

fail() {
    echo -e "${RED}$*${NC}" >&2
    exit 1
}

# Each background service runs in its own session (setsid), so killing the
# process group also takes down children spawned by npm/node.
stop_group() {
    local pgid="$1" name="$2"
    if [ -n "$pgid" ] && kill -0 -- "-$pgid" 2>/dev/null; then
        echo "Stopping $name"
        kill -- "-$pgid" 2>/dev/null || true
    fi
}

cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    stop_group "$SERVER_PGID" "c123-server"
    stop_group "$PLAYER_PGID" "player"
    # Give both a moment to release their ports so an immediate re-run works
    for _ in $(seq 1 10); do
        port_in_use "$SERVER_PORT" || port_in_use "$C123_PORT" || break
        sleep 1
    done
    echo "Logs kept in $LOG_DIR"
}
trap cleanup EXIT INT TERM

port_in_use() {
    ss -Hltn "sport = :$1" | grep -q .
}

# Polls a command until it succeeds or the timeout (seconds) runs out.
wait_for() {
    local timeout="$1" what="$2"
    shift 2
    for _ in $(seq 1 "$timeout"); do
        if "$@" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    fail "Timed out waiting for $what (logs: $LOG_DIR)"
}

STATIC_ONLY=false
if [ "${1:-}" == "--static-only" ]; then
    STATIC_ONLY=true
fi

echo -e "${GREEN}=== Screenshot Generation Script ===${NC}"
echo ""

# Ports must be free: static screenshots show the disconnected state, and a
# stray server would also feed the data run the wrong recording.
for port in $SERVER_PORT $C123_PORT; do
    if port_in_use "$port"; then
        fail "Port $port is already in use - stop the running c123-server/player first"
    fi
done

echo "Step 1: Running static screenshot tests (no server)..."
cd "$PROJECT_DIR"
npx playwright test screenshots-static.spec.ts --reporter=list

if [ "$STATIC_ONLY" = true ]; then
    echo -e "${GREEN}=== Static screenshots complete ===${NC}"
    exit 0
fi

[ -f "$PROTOCOL_DOCS_DIR/tools/player.js" ] || fail "player.js not found in $PROTOCOL_DOCS_DIR/tools"
[ -f "$C123_SERVER_DIR/dist/cli.js" ] || fail "c123-server is not built - run 'npm run build' in $C123_SERVER_DIR"

echo "Step 2: Fetching recording $RECORDING and starting player at $START_RACE..."
cd "$PROTOCOL_DOCS_DIR"
node tools/recordings-cli.js fetch "$RECORDING"
RECORDING_PATH="$(node tools/recordings-cli.js path "$RECORDING")"
XML_OUT="$LOG_DIR/replay.xml"

setsid node tools/player.js "$RECORDING_PATH" --start-at-race "$START_RACE" --autoplay --speed "$SPEED" --xml-out "$XML_OUT" \
    > "$LOG_DIR/player.log" 2>&1 &
PLAYER_PGID=$!
wait_for 15 "player on port $C123_PORT" port_in_use "$C123_PORT"

echo "Step 3: Starting c123-server..."
cd "$C123_SERVER_DIR"
setsid node dist/cli.js --host 127.0.0.1 --port "$C123_PORT" --xml "$XML_OUT" --no-discovery --no-tray \
    > "$LOG_DIR/c123-server.log" 2>&1 &
SERVER_PGID=$!
wait_for 30 "c123-server health" curl -sf "$SERVER_URL/health"

echo "Step 4: Waiting for race data..."
node "$SCRIPT_DIR/wait-for-server-data.cjs" "ws://127.0.0.1:$SERVER_PORT/ws" 90 \
    || fail "No race data from the replay (logs: $LOG_DIR)"

echo "Step 5: Running data screenshot tests..."
cd "$PROJECT_DIR"
npx playwright test screenshots-with-data.spec.ts --reporter=list

echo ""
echo -e "${GREEN}=== Screenshots complete! ===${NC}"
echo "Screenshots saved to: $PROJECT_DIR/docs/screenshots/"
