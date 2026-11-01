# MST Studio — Minimum Spanning Tree Visualizer

An educational web app for building weighted graphs and watching **Kruskal's** and **Prim's** algorithms find a minimum spanning tree, one decision at a time.

* **Frontend:** React 18 + Vite, SVG graph canvas, Lucide icons.
* **Backend:** C++17 HTTP server (cpp-httplib + nlohmann/json). **All MST computation happens in C++.** React only sends the graph and replays the recorded steps.

## Features

* **Graph editor:** add vertices by clicking, connect two vertices and enter a weight in a dialog, edit or delete edges and vertices, drag vertices, undo/redo, clear with confirmation. Duplicate edges are prevented; negative and zero weights are allowed.
* **Five ways to enter a graph:** interactive canvas, manual form, edge-list text, adjacency matrix (`INF` = no edge, so `0` is a real edge), JSON import. Plus six example graphs (beginner, classic, multiple MSTs, negative weights, disconnected, dense) and a seeded random generator (size, density, weight range, connected/disconnected).
* **Step-by-step visualization:** play, pause, previous, next, restart, run to end, reset, speeds 0.5×/1×/2×/4×, and a step slider. Edge colours: gray (normal), orange dashed (heap candidate), yellow (considered), teal (accepted), red (rejected/skipped). Vertex colours: neutral, blue (visited), purple (current). Every step explains *why* (DSU cycle check for Kruskal; stale-candidate logic for Prim).
* **Results dashboard:** algorithm, V, E, forest size, components, total weight, backend execution time (measured in C++), considered/accepted/rejected counts, whether a single MST exists, and a check that the result has exactly V − C edges.
* **Disconnected graphs** produce a *minimum spanning forest* and are labelled as such; empty and single-vertex graphs are explained rather than failing.
* **Algorithm comparison:** both algorithms on the same graph, side by side with synchronized stepping, matching-weight check and metrics table.
* **Edge classification:** exact critical / optional / excluded analysis (equal-weight groups + bridge detection), not a single-MST comparison.
* **Export:** graph JSON, result JSON, and a readable text report with complexity.
* **Learn tab:** explanations, Kruskal-vs-Prim table, glossary. Dark theme with optional light theme; responsive layout.

## Repository layout

```
backend/   C++17 server: include/ (Graph, DSU, Kruskal, Prim, Classifier, GraphValidator, ...), src/, tests/ (GoogleTest), third_party/ (vendored)
frontend/  React app: src/components, hooks, pages, services, utils, styles, test
docs/API.md   REST API reference
scripts/test-all.sh   run every test suite
start.sh / start.bat  build + run everything
```

## Prerequisites

| Tool | Version |
|---|---|
| C++ compiler | g++ 9+/clang 10+/MSVC 2019+ with C++17 |
| CMake | 3.14+ (`pip install cmake` works if your package manager is old) |
| Node.js + npm | 18+ |

All C++ dependencies (cpp-httplib 0.18.0, nlohmann/json 3.11.3, GoogleTest 1.14.0) are **vendored in `backend/third_party/`**; nothing is downloaded when building the backend.

## Quick start

```bash
./start.sh          # Linux / macOS  (builds backend on first run, installs npm deps, starts both)
start.bat           # Windows
```
Open http://localhost:5173. Set `MST_PORT=9090` to use another backend port.

### Manual start (development)

```bash
# 1. Backend
cd backend
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
./build/mst_server 8080          # Windows MSVC: build\Release\mst_server.exe 8080

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                      # http://localhost:5173 ; /api is proxied to http://localhost:8080
```
Using a different backend host/port: `VITE_BACKEND_URL=http://host:port npm run dev`. For a production build, `npm run build` then serve `frontend/dist` behind a proxy that forwards `/api` to the backend (or build with `VITE_API_BASE=http://host:port/api`).

## Tests

```bash
./scripts/test-all.sh                      # everything below in one go

cd backend && cmake -S . -B build && cmake --build build -j && ./build/mst_tests
cd frontend && npm test                    # Vitest + React Testing Library
cd frontend && ./../backend/build/mst_server 8080 &   # then:
cd frontend && npm run test:integration    # frontend <-> real C++ server
```

* **C++ (GoogleTest):** triangle/classic graphs, equal weights, multiple MSTs, negative and zero weights, self-loops, parallel edges, empty/single vertex, disconnected graphs, invalid indices, malformed input, overflow limits, Kruskal = Prim = brute force on hundreds of random graphs, V − 1 / V − C edge counts, exact edge classification vs brute force, and real HTTP requests to every route.
* **Frontend (Vitest):** graph editing, dialogs and duplicate prevention, undo/redo, samples, all import formats and their errors, export, algorithm switching, request payloads, backend errors, repeated-click guard, play/pause/step navigation on a timer, disconnected-graph display. Step fixtures in `src/test/fixtures/` are real output captured from the C++ server.
* **Integration:** every sample and 25 random graphs go through the real server; both algorithms must agree and the replayed final frame must equal the backend's MST.

## Input formats

**Edge list** (vertices numbered from **0**): first line `vertices edges`, then `source destination weight`.
```
5 7
0 1 2
0 2 4
1 2 1
1 3 7
2 3 3
2 4 5
3 4 6
```
**Adjacency matrix:** square and symmetric; `INF` (also `∞`, `-`) means no edge; the diagonal is ignored (write `0` or `INF`).
```
0 2 4 INF INF
2 0 1 7 INF
4 1 0 3 5
INF 7 3 0 6
INF INF 5 6 0
```
**JSON:** `{"vertices":3,"edges":[{"source":0,"destination":1,"weight":2}],"positions":[{"x":100,"y":100},...]}` (`positions` optional).

## The algorithms

**Kruskal** (`backend/src/Kruskal.cpp`): sort edges by (weight, id); for each edge ask a Disjoint Set Union (`find` with path compression, `unite` by size) whether the endpoints are already connected; accept if not, reject if so (it would close a cycle). Stops after V − 1 accepts. Time O(E log E), space O(V + E).

**Prim** (`backend/src/Prim.cpp`): adjacency list + `std::priority_queue` min-heap keyed by (weight, id). Start at a vertex, push its edges, repeatedly pop the lightest; if its far endpoint is already in the tree the entry is *stale* and skipped, otherwise the vertex joins the tree and its edges are pushed. On a disconnected graph a new tree starts from the lowest unvisited vertex. Time O((V + E) log V), space O(V + E).

**Edge classification** (`Classifier.cpp`): process edges in weight groups; edges whose endpoints are already connected by lighter edges are *excluded*; for the rest, contract components and run bridge detection on the group's graph: bridges are *critical* (in every MST), the rest *optional*.

Weights and totals are `int64_t`; inputs are limited to ±10¹² and 5 000 edges so sums cannot overflow.

## Troubleshooting

* **"Cannot reach the C++ backend"** in the app: the server is not running or is on another port. Start it (`./start.sh`) and check `curl http://localhost:8080/api/health`.
* **Port already in use:** `MST_PORT=9090 ./start.sh` or `./backend/build/mst_server 9090` with `VITE_BACKEND_URL=http://localhost:9090 npm run dev`.
* **CMake too old / missing:** `pip install cmake`. **No CMake at all:** `cd backend && g++ -std=c++17 -O2 -Iinclude -Ithird_party src/*.cpp -o mst_server -pthread`.
* **Windows:** run `start.bat` from a *x64 Native Tools Command Prompt for VS*, or use MinGW-w64.
* **Slow first compile:** cpp-httplib and nlohmann/json are large headers; the first build takes a minute or two.
* **Large graphs:** the editor hides weight labels above 90 edges to stay readable (select an edge or step through the algorithm to see them).

## Not covered

No browser/visual end-to-end test is included (the frontend is tested with jsdom and against the live API, not in a real browser), and `start.bat` has not been run on Windows.
#   m s t _ v i s u a l i z e r -  
 