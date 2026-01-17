#!/bin/bash
#
# take-screenshots.sh - Automated screenshot generation with replay server
#
# Usage: ./scripts/take-screenshots.sh [--static-only]
#
# This script:
# 1. Starts replay-server (simulates C123)
# 2. Starts c123-server (connects to replay)
# 3. Starts Vite dev server
# 4. Runs Playwright screenshot tests
# 5. Cleans up all processes
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PROTOCOL_DOCS_DIR="$PROJECT_DIR/../c123-protocol-docs"
C123_SERVER_DIR="$PROJECT_DIR/../c123-server"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# PIDs to track
REPLAY_PID=""
C123_PID=""
VITE_PID=""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"

    if [ -n "$VITE_PID" ] && kill -0 "$VITE_PID" 2>/dev/null; then
        echo "Stopping Vite dev server (PID: $VITE_PID)"
        kill "$VITE_PID" 2>/dev/null || true
    fi

    if [ -n "$C123_PID" ] && kill -0 "$C123_PID" 2>/dev/null; then
        echo "Stopping c123-server (PID: $C123_PID)"
        kill "$C123_PID" 2>/dev/null || true
    fi

    if [ -n "$REPLAY_PID" ] && kill -0 "$REPLAY_PID" 2>/dev/null; then
        echo "Stopping replay-server (PID: $REPLAY_PID)"
        kill "$REPLAY_PID" 2>/dev/null || true
    fi

    # Kill any orphaned processes on our ports
    fuser -k 27333/tcp 2>/dev/null || true
    fuser -k 27123/tcp 2>/dev/null || true
    fuser -k 5173/tcp 2>/dev/null || true

    echo -e "${GREEN}Cleanup complete.${NC}"
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Check for static-only mode
STATIC_ONLY=false
if [ "$1" == "--static-only" ]; then
    STATIC_ONLY=true
fi

echo -e "${GREEN}=== Screenshot Generation Script ===${NC}"
echo ""

# Clean up any existing processes on our ports first
echo "Cleaning up any existing processes..."
fuser -k 27333/tcp 2>/dev/null || true
fuser -k 27123/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
sleep 2

# Check prerequisites
if [ ! -d "$PROTOCOL_DOCS_DIR/tools" ]; then
    echo -e "${RED}Error: c123-protocol-docs/tools not found at $PROTOCOL_DOCS_DIR${NC}"
    exit 1
fi

if [ ! -d "$C123_SERVER_DIR" ]; then
    echo -e "${RED}Error: c123-server not found at $C123_SERVER_DIR${NC}"
    exit 1
fi

# Find recording file
RECORDING="$PROTOCOL_DOCS_DIR/recordings/rec-2025-12-28T09-34-10.jsonl"
if [ ! -f "$RECORDING" ]; then
    echo -e "${RED}Error: Recording file not found: $RECORDING${NC}"
    exit 1
fi

if [ "$STATIC_ONLY" = true ]; then
    echo -e "${YELLOW}Running static tests only (no servers needed)${NC}"
    cd "$PROJECT_DIR"
    npx playwright test screenshots-static.spec.ts --reporter=list
    echo ""
    echo -e "${GREEN}=== Static screenshots complete! ===${NC}"
    echo "Screenshots saved to: $PROJECT_DIR/docs/screenshots/"
    echo ""
    ls -la "$PROJECT_DIR/docs/screenshots/" | grep -E "^-" | head -10
    exit 0
fi

echo "Step 1/6: Starting replay-server..."
cd "$PROTOCOL_DOCS_DIR/tools"
node replay-server.js "$RECORDING" --speed 10 --loop > /tmp/replay-server.log 2>&1 &
REPLAY_PID=$!
echo "  replay-server PID: $REPLAY_PID"

# Wait for replay server to start
sleep 2
if ! kill -0 "$REPLAY_PID" 2>/dev/null; then
    echo -e "${RED}Error: replay-server failed to start${NC}"
    cat /tmp/replay-server.log
    exit 1
fi

echo "Step 2/6: Starting c123-server..."
cd "$C123_SERVER_DIR"
npm start -- --host localhost --port 27333 > /tmp/c123-server.log 2>&1 &
C123_PID=$!
echo "  c123-server PID: $C123_PID"

# Wait for c123-server to start
sleep 3
if ! kill -0 "$C123_PID" 2>/dev/null; then
    echo -e "${RED}Error: c123-server failed to start${NC}"
    cat /tmp/c123-server.log
    exit 1
fi

echo "Step 3/6: Starting Vite dev server..."
cd "$PROJECT_DIR"
npm run dev > /tmp/vite-server.log 2>&1 &
VITE_PID=$!
echo "  Vite dev server PID: $VITE_PID"

# Wait for Vite to start
sleep 3
if ! kill -0 "$VITE_PID" 2>/dev/null; then
    echo -e "${RED}Error: Vite dev server failed to start${NC}"
    cat /tmp/vite-server.log
    exit 1
fi

echo "Step 4/6: Waiting for servers to be ready..."
# Wait for WebSocket to be available
for i in {1..10}; do
    if curl -s http://localhost:27123/health > /dev/null 2>&1; then
        echo "  c123-server is ready"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${YELLOW}Warning: c123-server health check timed out, proceeding anyway...${NC}"
    fi
    sleep 1
done

# Wait for Vite
for i in {1..10}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "  Vite dev server is ready"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${YELLOW}Warning: Vite health check timed out, proceeding anyway...${NC}"
    fi
    sleep 1
done

# Extra wait for data to flow
echo "  Waiting for data to flow through system..."
sleep 5

echo "Step 5/6: Running static screenshot tests..."
cd "$PROJECT_DIR"
npx playwright test screenshots-static.spec.ts --reporter=list

echo "Step 6/6: Running data screenshot tests..."
npx playwright test screenshots-with-data.spec.ts --reporter=list

echo ""
echo -e "${GREEN}=== Screenshots complete! ===${NC}"
echo "Screenshots saved to: $PROJECT_DIR/docs/screenshots/"
echo ""
ls -la "$PROJECT_DIR/docs/screenshots/" | tail -20
