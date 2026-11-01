import { useCallback, useRef, useState } from 'react';
import * as api from '../services/api.js';
import { graphSignature, toRequest } from '../utils/graphModel.js';

// Runs algorithms on the C++ backend and caches results by the graph they were computed for.
export function useMST() {
  const [runs, setRuns] = useState({ kruskal: null, prim: null });
  const [compare, setCompare] = useState(null);
  const [classification, setClassification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const busy = useRef(false); // blocks repeated clicks while a request is in flight

  const wrap = useCallback(async (fn) => {
    if (busy.current) return null;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError({ kind: err.kind || 'unknown', message: err.message || 'Something went wrong.', details: err.details || [] });
      return null;
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  const run = useCallback((algorithm, graph) => wrap(async () => {
    const data = await api.runAlgorithm(algorithm, toRequest(graph));
    setRuns((r) => ({ ...r, [algorithm]: { data, signature: graphSignature(graph) } }));
    return data;
  }), [wrap]);

  const runCompare = useCallback((graph) => wrap(async () => {
    const data = await api.compareAlgorithms(toRequest(graph));
    setCompare({ data, signature: graphSignature(graph) });
    setRuns({ kruskal: { data: data.kruskal, signature: graphSignature(graph) }, prim: { data: data.prim, signature: graphSignature(graph) } });
    return data;
  }), [wrap]);

  const classify = useCallback((graph) => wrap(async () => {
    const data = await api.classifyEdges(toRequest(graph));
    setClassification({ data, signature: graphSignature(graph) });
    return data;
  }), [wrap]);

  const clear = useCallback(() => {
    setRuns({ kruskal: null, prim: null });
    setCompare(null);
    setClassification(null);
    setError(null);
  }, []);

  return { runs, compare, classification, loading, error, setError, run, runCompare, classify, clear };
}
