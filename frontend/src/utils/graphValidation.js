import { LIMITS } from './graphModel.js';

// Client-side validation for graph data { n, edges: [{source, destination, weight}] }.
// The backend validates again; this gives instant, friendly feedback before any request.
export function validateGraphData(n, edges) {
  const errors = [];
  if (!Number.isInteger(n) || n < 0) errors.push('The number of vertices must be a whole number, 0 or more.');
  else if (n > LIMITS.maxVertices) errors.push(`At most ${LIMITS.maxVertices} vertices are supported.`);
  if (edges.length > LIMITS.maxEdges) errors.push(`At most ${LIMITS.maxEdges} edges are supported.`);
  const seen = new Map();
  edges.forEach((e, i) => {
    const label = `Edge ${i + 1}`;
    for (const key of ['source', 'destination', 'weight']) {
      if (!Number.isInteger(e[key])) {
        errors.push(`${label}: ${key} must be a whole number.`);
        return;
      }
    }
    if (e.source < 0 || e.source >= n) errors.push(`${label}: source ${e.source} is not a vertex (valid: 0 to ${n - 1}).`);
    if (e.destination < 0 || e.destination >= n) errors.push(`${label}: destination ${e.destination} is not a vertex (valid: 0 to ${n - 1}).`);
    if (Math.abs(e.weight) > LIMITS.maxAbsWeight) errors.push(`${label}: weight is outside ±${LIMITS.maxAbsWeight}.`);
    if (e.source === e.destination) errors.push(`${label}: self-loops (${e.source}–${e.destination}) are not supported.`);
    const key = `${Math.min(e.source, e.destination)}-${Math.max(e.source, e.destination)}`;
    if (seen.has(key)) errors.push(`${label}: duplicates edge ${seen.get(key)} (${key.replace('-', '–')}). Keep only one edge per pair.`);
    else seen.set(key, i + 1);
  });
  return errors.slice(0, 20);
}
