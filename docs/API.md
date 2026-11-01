# MST Studio REST API

Base URL (default): `http://localhost:8080`. All bodies are JSON. CORS is enabled for local development (`Access-Control-Allow-Origin: *`).
Request limit: 2 MB body, 500 vertices, 5 000 edges, weights within ±1 000 000 000 000 (so totals fit in `int64_t` and in JavaScript's exact integer range).

## Graph request format

```json
{
  "vertices": 5,
  "edges": [
    {"source": 0, "destination": 1, "weight": 2},
    {"source": 0, "destination": 2, "weight": 4}
  ]
}
```

* Vertices are numbered `0 … vertices-1`.
* Weights must be whole numbers. Negative and zero weights are valid.
* Each edge gets an **edge id equal to its index** in the `edges` array. Every response refers to edges by that id.
* Self-loops and parallel edges are accepted by the API (they produce warnings and are handled correctly: a self-loop is never chosen; the lightest parallel edge wins). The web editor does not create them.

## Endpoints

### `GET /api/health`
`200` → `{"success":true,"status":"ok","name":"MST Studio backend","version":"1.0.0","limits":{...}}`

### `POST /api/graph/validate`
Always `200` for well-formed JSON. `{"success":true,"valid":false,"errors":[{"code","message","path"}],"warnings":[...]}`. Malformed JSON → `400`.
Error codes: `MALFORMED`, `MISSING_FIELD`, `NOT_INTEGER`, `OUT_OF_RANGE`, `INVALID_VERTEX`, `TOO_MANY_EDGES`.

### `POST /api/mst/kruskal` and `POST /api/mst/prim`
`200` →
```jsonc
{
  "success": true,
  "algorithm": "kruskal",              // or "prim"
  "vertices": 4, "edgeCount": 5,
  "edges": [{"id":0,"source":0,"destination":1,"weight":1}, ...],
  "mstEdgeIds": [0,1,2],
  "mstEdges": [{"id":0,"source":0,"destination":1,"weight":1}, ...],
  "totalWeight": 6,                    // int64
  "components": 1,                     // connected components of the input graph
  "isConnected": true,                 // true => a single MST exists; false => minimum spanning forest
  "expectedEdges": 3,                  // V - C
  "forestSizeVerified": true,          // |mstEdges| == V - C
  "summary": "The graph is connected, so a single MST exists: ...",
  "steps": [ /* see below */ ],
  "metrics": {"durationMicros":12,"considered":6,"accepted":3,"rejected":1,"stepCount":9,"selfLoopsIgnored":0},
  "warnings": []
}
```

**Step object**

| field | meaning |
|---|---|
| `index` | 0-based position |
| `action` | `start`, `consider`, `accept`, `reject` (Kruskal), `skip` (Prim stale candidate), `finish` |
| `edgeId`, `source`, `target`, `weight` | edge in focus (`-1` when none). For Prim `source` is the tree side. |
| `vertex` | Prim: start vertex or newly added vertex (`-1` otherwise) |
| `reason` | Plain-language explanation, including the DSU / stale-candidate reasoning |
| `mstWeight`, `accepted` | running totals *after* this step |
| `state` | short description (components left, heap size, …) |
| `pushed` | Prim: ids of edges pushed on the heap by this step |

Ties are broken by edge id (Kruskal sort key and Prim heap key are `(weight, id)`), so output is deterministic.
Kruskal stops as soon as `V-1` edges are accepted; Prim starts a new tree at the lowest unvisited vertex when the heap runs dry (forest).

### `POST /api/mst/compare`
Runs both algorithms: `{"success":true,"vertices","edges","kruskal":{...},"prim":{...},"weightsMatch":true,"sameEdgeSet":false,"warnings":[]}`.
`weightsMatch` compares total weight and component count. Edge sets may legitimately differ when several MSTs tie.

### `POST /api/mst/classify`
Exact edge classification using equal-weight groups and bridge detection on the contracted graph:
`{"success":true,"classes":[{"id":0,"class":"critical"|"optional"|"excluded"}],"counts":{"critical":n,"optional":n,"excluded":n}}`.
`critical` = in every MST, `optional` = in some but not all, `excluded` = in none.

## Errors

```json
{"success":false,"code":"INVALID_GRAPH","error":"Destination 9 is not a vertex (valid: 0..1).","details":[{"code":"INVALID_VERTEX","message":"...","path":"edges[0].destination"}]}
```

| status | when |
|---|---|
| 400 | body is not valid JSON (`INVALID_JSON`) |
| 404 | unknown endpoint |
| 413 | body larger than 2 MB |
| 422 | valid JSON, invalid graph (`INVALID_GRAPH`, with `details`) |
| 500 | unexpected server error (`INTERNAL_ERROR`) |

## curl example

```bash
curl -s -X POST http://localhost:8080/api/mst/prim -H 'Content-Type: application/json' \
  -d '{"vertices":3,"edges":[{"source":0,"destination":1,"weight":1},{"source":1,"destination":2,"weight":2},{"source":0,"destination":2,"weight":3}]}'
```
