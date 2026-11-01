import { validateGraphData } from './graphValidation.js';

const INT = /^[-+]?\d+$/;
const NO_EDGE = new Set(['inf', '∞', 'infinity', '-', 'x', 'none', 'null']);

const fail = (errors) => ({ ok: false, errors });
const done = (n, edges, extra = {}) => {
  const errors = validateGraphData(n, edges);
  return errors.length ? fail(errors) : { ok: true, n, edges, ...extra };
};

// "n m" on the first line, then m lines "source destination weight". Zero-based vertices.
export function parseEdgeList(text) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((l, i) => ({ text: l.trim(), no: i + 1 }))
    .filter((l) => l.text !== '' && !l.text.startsWith('#'));
  if (lines.length === 0) return fail(['The edge list is empty. Start with "vertices edges", then one edge per line.']);
  const head = lines[0].text.split(/\s+/);
  if (head.length !== 2 || !head.every((t) => INT.test(t)))
    return fail([`Line ${lines[0].no}: the first line must be two whole numbers: the vertex count and the edge count.`]);
  const [n, m] = head.map(Number);
  if (n < 0 || m < 0) return fail([`Line ${lines[0].no}: counts cannot be negative.`]);
  const body = lines.slice(1);
  const errors = [];
  if (body.length !== m) errors.push(`The header promises ${m} edge${m === 1 ? '' : 's'} but ${body.length} edge line${body.length === 1 ? ' was' : 's were'} found.`);
  const edges = [];
  body.forEach((l) => {
    const t = l.text.split(/[\s,]+/);
    if (t.length !== 3 || !t.every((x) => INT.test(x))) {
      errors.push(`Line ${l.no}: expected "source destination weight" as three whole numbers, got "${l.text}".`);
      return;
    }
    edges.push({ source: Number(t[0]), destination: Number(t[1]), weight: Number(t[2]) });
  });
  if (errors.length) return fail(errors.slice(0, 20));
  return done(n, edges);
}

export function edgeListText(graph) {
  const n = graph.vertices.length;
  return [`${n} ${graph.edges.length}`, ...graph.edges.map((e) => `${e.source} ${e.destination} ${e.weight}`)].join('\n');
}

// Weighted adjacency matrix. "INF" (or ∞, -, x) marks no edge; 0 is a real zero-weight edge off the diagonal.
export function parseMatrix(text) {
  const rows = String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
    .map((l) => l.split(/[\s,;]+/).filter(Boolean));
  if (rows.length === 0) return fail(['The matrix is empty.']);
  const n = rows.length;
  const errors = [];
  rows.forEach((r, i) => {
    if (r.length !== n) errors.push(`Row ${i + 1} has ${r.length} value${r.length === 1 ? '' : 's'}; a ${n}-vertex graph needs ${n} per row (square matrix).`);
  });
  if (errors.length) return fail(errors.slice(0, 20));
  const cell = (i, j) => {
    const raw = rows[i][j];
    if (NO_EDGE.has(raw.toLowerCase())) return null;
    if (!INT.test(raw)) {
      errors.push(`Row ${i + 1}, column ${j + 1}: "${raw}" is not a whole number or INF.`);
      return undefined;
    }
    return Number(raw);
  };
  const edges = [];
  for (let i = 0; i < n; i++) {
    const diag = cell(i, i);
    if (diag !== null && diag !== 0 && diag !== undefined) errors.push(`Row ${i + 1}: the diagonal must be INF or 0 (self-loops are not supported).`);
    for (let j = i + 1; j < n; j++) {
      const a = cell(i, j), b = cell(j, i);
      if (a === undefined || b === undefined) continue;
      if (a !== b) errors.push(`The matrix is not symmetric at (${i}, ${j}) = ${a ?? 'INF'} and (${j}, ${i}) = ${b ?? 'INF'}. Undirected graphs need matching values.`);
      else if (a !== null) edges.push({ source: i, destination: j, weight: a });
    }
  }
  if (errors.length) return fail(errors.slice(0, 20));
  return done(n, edges);
}

export function matrixText(graph) {
  const n = graph.vertices.length;
  const m = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? '0' : 'INF')));
  graph.edges.forEach((e) => {
    m[e.source][e.destination] = String(e.weight);
    m[e.destination][e.source] = String(e.weight);
  });
  return m.map((r) => r.join(' ')).join('\n');
}

// JSON produced by exportGraph (or hand-written): { vertices, edges: [{source,destination,weight}], positions? }
export function parseGraphJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return fail(['This is not valid JSON. Check for missing quotes, commas or brackets.']);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(['Expected a JSON object with "vertices" and "edges".']);
  if (!Number.isInteger(data.vertices)) return fail(['"vertices" must be a whole number.']);
  if (!Array.isArray(data.edges)) return fail(['"edges" must be an array.']);
  const edges = data.edges.map((e) => ({ source: e?.source, destination: e?.destination, weight: e?.weight }));
  let positions;
  if (Array.isArray(data.positions) && data.positions.length === data.vertices && data.positions.every((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y)))
    positions = data.positions.map((p) => ({ x: p.x, y: p.y }));
  return done(data.vertices, edges, { positions });
}
