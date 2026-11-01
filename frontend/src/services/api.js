// Thin client for the C++ backend. All MST computation happens there; this file only sends graphs and returns JSON.
const BASE = (import.meta.env?.VITE_API_BASE ?? '/api').replace(/\/$/, '');
const TIMEOUT_MS = 10000;

export class ApiError extends Error {
  constructor(kind, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind; // 'network' | 'timeout' | 'validation' | 'bad-request' | 'server' | 'malformed'
    this.details = details;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw new ApiError('timeout', 'The backend took too long to respond. Try a smaller graph or check that the server is running.');
    throw new ApiError('network', 'Cannot reach the C++ backend. Start it with ./start.sh (or start.bat), or run mst_server on port 8080.');
  } finally {
    clearTimeout(timer);
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new ApiError('malformed', `The backend sent a response this app cannot read (HTTP ${res.status}).`);
  }
  if (!res.ok || data?.success === false) {
    if (res.status === 422) throw new ApiError('validation', data?.error || 'The backend rejected this graph.', data?.details || []);
    if (res.status >= 500) throw new ApiError('server', data?.error || 'The backend failed while processing the graph.');
    throw new ApiError('bad-request', data?.error || `Request failed (HTTP ${res.status}).`, data?.details || []);
  }
  return data;
}

export const health = () => request('/health');
export const validateGraph = (graph) => request('/graph/validate', { method: 'POST', body: graph });
export const runKruskal = (graph) => request('/mst/kruskal', { method: 'POST', body: graph });
export const runPrim = (graph) => request('/mst/prim', { method: 'POST', body: graph });
export const compareAlgorithms = (graph) => request('/mst/compare', { method: 'POST', body: graph });
export const classifyEdges = (graph) => request('/mst/classify', { method: 'POST', body: graph });

export const runAlgorithm = (algorithm, graph) => (algorithm === 'prim' ? runPrim(graph) : runKruskal(graph));
