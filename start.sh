#!/usr/bin/env bash
# MST Studio launcher for Linux / macOS: builds the C++ backend if needed, then starts backend + frontend.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${MST_PORT:-8080}"

fail() { echo "ERROR: $1" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "'$1' was not found. $2"; }

echo "== Checking prerequisites"
if ! command -v g++ >/dev/null 2>&1 && ! command -v clang++ >/dev/null 2>&1; then
  fail "No C++17 compiler found. Install g++ (Ubuntu: sudo apt install build-essential) or clang++ (macOS: xcode-select --install)."
fi
need cmake "Install CMake 3.14+ (Ubuntu: sudo apt install cmake, macOS: brew install cmake, or: pip install cmake)."
need node "Install Node.js 18+ from https://nodejs.org."
need npm "npm ships with Node.js: https://nodejs.org."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || fail "Node.js 18 or newer is required (found $(node -v))."

BIN="$ROOT/backend/build/mst_server"
if [ ! -x "$BIN" ]; then
  echo "== Building the C++ backend (first run takes a minute or two)"
  cmake -S "$ROOT/backend" -B "$ROOT/backend/build" -DCMAKE_BUILD_TYPE=Release -DMST_BUILD_TESTS=OFF >/dev/null \
    || fail "CMake configuration failed. See README.md > Troubleshooting."
  cmake --build "$ROOT/backend/build" --target mst_server -j "$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 2)" \
    || fail "The C++ backend failed to compile. See README.md > Troubleshooting."
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "== Installing frontend dependencies"
  (cd "$ROOT/frontend" && npm install --no-audit --no-fund) || fail "npm install failed. Check your network connection."
fi

echo "== Starting the C++ backend on port $PORT"
"$BIN" "$PORT" &
BACKEND_PID=$!
cleanup() { kill "$BACKEND_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
sleep 1
kill -0 "$BACKEND_PID" 2>/dev/null || fail "The backend exited immediately. Is port $PORT already in use? Try: MST_PORT=9090 ./start.sh"

if command -v curl >/dev/null 2>&1; then
  curl -fs "http://localhost:$PORT/api/health" >/dev/null && echo "   Backend health check OK" || fail "Backend is running but /api/health did not answer."
fi

echo "== Starting the frontend (open the URL printed below, usually http://localhost:5173)"
cd "$ROOT/frontend"
VITE_BACKEND_URL="http://localhost:$PORT" npm run dev
