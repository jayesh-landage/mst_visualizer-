import { useCallback, useReducer } from 'react';
import {
  addEdge as addEdgeFn, addVertex as addVertexFn, emptyGraph, graphFromData, moveVertex as moveFn,
  removeEdge as removeEdgeFn, removeVertex as removeVertexFn, updateEdgeWeight as updateWeightFn,
} from '../utils/graphModel.js';

const HISTORY_LIMIT = 100;
const init = { present: emptyGraph(), past: [], future: [] };

function reducer(state, action) {
  switch (action.type) {
    case 'apply':
      return { present: action.graph, past: [...state.past, state.present].slice(-HISTORY_LIMIT), future: [] };
    case 'live': // drag updates: no history entry
      return { ...state, present: action.graph };
    case 'snapshot': // taken once when a drag starts, so the whole drag undoes in one step
      return { present: state.present, past: [...state.past, state.present].slice(-HISTORY_LIMIT), future: [] };
    case 'undo': {
      if (!state.past.length) return state;
      return { present: state.past[state.past.length - 1], past: state.past.slice(0, -1), future: [state.present, ...state.future] };
    }
    case 'redo': {
      if (!state.future.length) return state;
      return { present: state.future[0], past: [...state.past, state.present], future: state.future.slice(1) };
    }
    default:
      return state;
  }
}

export function useGraph(initial) {
  const [state, dispatch] = useReducer(reducer, initial ? { ...init, present: initial } : init);
  const graph = state.present;

  // Each editing helper returns an error string, or null on success.
  const addVertex = useCallback((x, y) => {
    const r = addVertexFn(graph, x, y);
    if (r.error) return r.error;
    dispatch({ type: 'apply', graph: r.graph });
    return null;
  }, [graph]);

  const addEdge = useCallback((a, b, weight) => {
    const r = addEdgeFn(graph, a, b, weight);
    if (r.error) return r.error;
    dispatch({ type: 'apply', graph: r.graph });
    return null;
  }, [graph]);

  const setWeight = useCallback((uid, weight) => {
    const r = updateWeightFn(graph, uid, weight);
    if (r.error) return r.error;
    dispatch({ type: 'apply', graph: r.graph });
    return null;
  }, [graph]);

  const deleteEdge = useCallback((uid) => dispatch({ type: 'apply', graph: removeEdgeFn(graph, uid) }), [graph]);
  const deleteVertex = useCallback((i) => dispatch({ type: 'apply', graph: removeVertexFn(graph, i) }), [graph]);
  const beginDrag = useCallback(() => dispatch({ type: 'snapshot' }), []);
  const moveVertex = useCallback((i, x, y) => dispatch({ type: 'live', graph: moveFn(graph, i, x, y) }), [graph]);
  const loadData = useCallback((n, edges, positions) => dispatch({ type: 'apply', graph: graphFromData(n, edges, positions) }), []);
  const clear = useCallback(() => dispatch({ type: 'apply', graph: emptyGraph() }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  return {
    graph, addVertex, addEdge, setWeight, deleteEdge, deleteVertex, beginDrag, moveVertex, loadData, clear, undo, redo,
    canUndo: state.past.length > 0, canRedo: state.future.length > 0,
  };
}
