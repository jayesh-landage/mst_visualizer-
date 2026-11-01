// Rebuilds what the canvas should look like at step `index` by replaying the steps recorded by the C++ backend.
// No algorithm runs here: this only interprets the recorded step sequence.

export function computeFrame(result, index) {
  const frame = {
    edgeState: {},       // edge id -> 'current' | 'accepted' | 'rejected' | 'candidate'
    vertexState: {},     // vertex -> 'visited' | 'current'
    frontier: [],        // Prim: edge ids currently on the heap
    step: null,
    mstWeight: 0,
    accepted: 0,
  };
  if (!result || !result.steps?.length) return frame;
  const last = Math.min(Math.max(index, 0), result.steps.length - 1);
  const isPrim = result.algorithm === 'prim';
  const frontier = new Set();
  const visited = new Set();
  for (let i = 0; i <= last; i++) {
    const s = result.steps[i];
    (s.pushed || []).forEach((id) => frontier.add(id));
    if (s.edgeId >= 0) {
      if (s.action === 'consider') {
        frontier.delete(s.edgeId);
        frame.edgeState[s.edgeId] = 'current';
      } else if (s.action === 'accept') {
        frame.edgeState[s.edgeId] = 'accepted';
        if (!isPrim) { visited.add(s.source); visited.add(s.target); }
      } else if (s.action === 'reject' || s.action === 'skip') {
        frame.edgeState[s.edgeId] = 'rejected';
      }
    }
    if (isPrim && s.vertex >= 0 && (s.action === 'start' || s.action === 'accept')) visited.add(s.vertex);
  }
  frontier.forEach((id) => {
    if (!frame.edgeState[id]) frame.edgeState[id] = 'candidate';
  });
  const cur = result.steps[last];
  visited.forEach((v) => (frame.vertexState[v] = 'visited'));
  const focus = [];
  if (cur.vertex >= 0) focus.push(cur.vertex);
  else if (cur.edgeId >= 0) isPrim ? focus.push(cur.target) : focus.push(cur.source, cur.target);
  focus.forEach((v) => (frame.vertexState[v] = 'current'));
  frame.frontier = [...frontier];
  frame.step = cur;
  frame.mstWeight = cur.mstWeight;
  frame.accepted = cur.accepted;
  return frame;
}

export const finalEdgeState = (result) => {
  const map = {};
  (result?.mstEdgeIds || []).forEach((id) => (map[id] = 'accepted'));
  return map;
};
