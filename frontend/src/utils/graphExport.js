import { toRequest } from './graphModel.js';

export function graphToJsonText(graph) {
  const req = toRequest(graph);
  return JSON.stringify({ format: 'mst-studio-graph', version: 1, ...req, positions: graph.vertices.map((v) => ({ x: v.x, y: v.y })) }, null, 2);
}

export function resultToJsonText(result, graph) {
  return JSON.stringify({ format: 'mst-studio-result', version: 1, graph: toRequest(graph), result }, null, 2);
}

const COMPLEXITY = {
  kruskal: { time: 'O(E log E)', space: 'O(V + E)', note: 'Sorting dominates; DSU operations are near-constant amortized (inverse Ackermann).' },
  prim: { time: 'O((V + E) log V)', space: 'O(V + E)', note: 'Adjacency list with a binary min-heap (std::priority_queue).' },
};

export function buildReport(result, graph) {
  const name = result.algorithm === 'kruskal' ? "Kruskal's algorithm" : "Prim's algorithm";
  const c = COMPLEXITY[result.algorithm];
  const lines = [
    'MST STUDIO REPORT',
    '=================',
    '',
    'Graph',
    `  Vertices: ${result.vertices}`,
    `  Edges:    ${result.edgeCount}`,
    ...graph.edges.map((e, i) => `    #${i}: ${e.source} - ${e.destination}  (weight ${e.weight})`),
    '',
    `Algorithm: ${name}`,
    `Result:    ${result.isConnected ? 'Minimum spanning tree' : 'Minimum spanning forest'}`,
    `Summary:   ${result.summary}`,
    `Total weight: ${result.totalWeight}`,
    `Connected components: ${result.components}`,
    `Edges in result: ${result.mstEdges.length} (expected V - C = ${result.expectedEdges}; ${result.forestSizeVerified ? 'verified' : 'MISMATCH'})`,
    ...result.mstEdges.map((e) => `    #${e.id}: ${e.source} - ${e.destination}  (weight ${e.weight})`),
    '',
    'Metrics',
    `  Backend execution time: ${result.metrics.durationMicros} µs`,
    `  Edges considered: ${result.metrics.considered}`,
    `  Accepted: ${result.metrics.accepted}   Rejected/skipped: ${result.metrics.rejected}`,
    `  Recorded steps: ${result.metrics.stepCount}`,
    '',
    'Complexity',
    `  Time:  ${c.time}`,
    `  Space: ${c.space}`,
    `  ${c.note}`,
    '',
  ];
  return lines.join('\n');
}

export function downloadText(filename, text, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
