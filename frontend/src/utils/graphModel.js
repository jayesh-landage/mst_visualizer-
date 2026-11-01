// Pure graph-editing helpers. A graph is { vertices: [{x, y}], edges: [{uid, source, destination, weight}], nextUid }.
// Vertex identity is its index (the label shown on the canvas and sent to the backend).

export const LIMITS = { maxVertices: 500, maxEdges: 5000, maxAbsWeight: 1_000_000_000_000 };
export const CANVAS = { width: 900, height: 560 };

export const emptyGraph = () => ({ vertices: [], edges: [], nextUid: 1 });

export function parseWeight(text) {
  const s = String(text ?? '').trim();
  if (s === '') return { ok: false, error: 'Enter a weight.' };
  if (!/^[-+]?\d+$/.test(s)) return { ok: false, error: 'Weight must be a whole number (negative and zero are allowed).' };
  const value = Number(s);
  if (!Number.isSafeInteger(value) || Math.abs(value) > LIMITS.maxAbsWeight)
    return { ok: false, error: `Weight must be between -${LIMITS.maxAbsWeight} and ${LIMITS.maxAbsWeight}.` };
  return { ok: true, value };
}

export function findEdge(graph, a, b) {
  return graph.edges.find(
    (e) => (e.source === a && e.destination === b) || (e.source === b && e.destination === a),
  );
}

export function addVertex(graph, x, y) {
  if (graph.vertices.length >= LIMITS.maxVertices) return { graph, error: `A graph can have at most ${LIMITS.maxVertices} vertices.` };
  return { graph: { ...graph, vertices: [...graph.vertices, { x: Math.round(x), y: Math.round(y) }] } };
}

export function addEdge(graph, a, b, weight) {
  if (a === b) return { graph, error: 'Self-loops are not supported in the editor. Choose two different vertices.' };
  if (a < 0 || b < 0 || a >= graph.vertices.length || b >= graph.vertices.length) return { graph, error: 'Both endpoints must be existing vertices.' };
  if (findEdge(graph, a, b)) return { graph, error: `Vertices ${a} and ${b} are already connected. Edit that edge's weight instead.` };
  if (graph.edges.length >= LIMITS.maxEdges) return { graph, error: `A graph can have at most ${LIMITS.maxEdges} edges.` };
  const w = parseWeight(weight);
  if (!w.ok) return { graph, error: w.error };
  const edge = { uid: graph.nextUid, source: a, destination: b, weight: w.value };
  return { graph: { ...graph, edges: [...graph.edges, edge], nextUid: graph.nextUid + 1 } };
}

export function updateEdgeWeight(graph, uid, weight) {
  const w = parseWeight(weight);
  if (!w.ok) return { graph, error: w.error };
  return { graph: { ...graph, edges: graph.edges.map((e) => (e.uid === uid ? { ...e, weight: w.value } : e)) } };
}

export const removeEdge = (graph, uid) => ({ ...graph, edges: graph.edges.filter((e) => e.uid !== uid) });

// Removing vertex i deletes its edges and renumbers later vertices so labels stay 0..n-1.
export function removeVertex(graph, i) {
  const shift = (v) => (v > i ? v - 1 : v);
  return {
    ...graph,
    vertices: graph.vertices.filter((_, k) => k !== i),
    edges: graph.edges
      .filter((e) => e.source !== i && e.destination !== i)
      .map((e) => ({ ...e, source: shift(e.source), destination: shift(e.destination) })),
  };
}

export function moveVertex(graph, i, x, y) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const vertices = graph.vertices.map((p, k) =>
    k === i ? { x: Math.round(clamp(x, 24, CANVAS.width - 24)), y: Math.round(clamp(y, 24, CANVAS.height - 24)) } : p,
  );
  return { ...graph, vertices };
}

export function circleLayout(n) {
  const cx = CANVAS.width / 2, cy = CANVAS.height / 2;
  const r = Math.min(CANVAS.width, CANVAS.height) / 2 - 60;
  if (n === 1) return [{ x: cx, y: cy }];
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: Math.round(cx + r * Math.cos(a) * 1.35), y: Math.round(cy + r * Math.sin(a)) };
  });
}

// Build an editor graph from plain data: n vertices and [{source, destination, weight}].
export function graphFromData(n, edges, positions) {
  const layout = positions && positions.length === n ? positions : circleLayout(n);
  return {
    vertices: layout.map((p) => ({ x: p.x, y: p.y })),
    edges: edges.map((e, i) => ({ uid: i + 1, source: e.source, destination: e.destination, weight: e.weight })),
    nextUid: edges.length + 1,
  };
}

// Request body for the C++ backend. Backend edge id == index in this array.
export const toRequest = (graph) => ({
  vertices: graph.vertices.length,
  edges: graph.edges.map((e) => ({ source: e.source, destination: e.destination, weight: e.weight })),
});

export const graphSignature = (graph) => JSON.stringify(toRequest(graph));

export const isEmptyGraph = (graph) => graph.vertices.length === 0;
