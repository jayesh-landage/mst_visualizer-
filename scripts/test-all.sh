#!/usr/bin/env bash
# Builds and runs every automated test: C++ (GoogleTest), frontend (Vitest), and the live frontend<->backend integration tests.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=18080

echo "== C++ backend tests"
cmake -S "$ROOT/backend" -B "$ROOT/backend/build" -DCMAKE_BUILD_TYPE=Release -DMST_BUILD_TESTS=ON >/dev/null
cmake --build "$ROOT/backend/build" -j "$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 2)"
"$ROOT/backend/build/mst_tests"

echo "== Frontend tests"
cd "$ROOT/frontend"
[ -d node_modules ] || npm install --no-audit --no-fund
npm test

echo "== Live integration tests (real C++ server on port $PORT)"
"$ROOT/backend/build/mst_server" "$PORT" &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1
VITE_API_BASE="http://localhost:$PORT/api" npx vitest run src/test/integration.test.js
echo "== All tests passed"
