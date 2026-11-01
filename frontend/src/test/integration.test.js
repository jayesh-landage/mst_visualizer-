// @vitest-environment node
// Runs against a REAL C++ backend. Skipped unless VITE_API_BASE is set (see `npm run test:integration`).
import { describe, it, expect } from 'vitest';
import * as api from '../services/api.js';
import { SAMPLES } from '../utils/samples.js';
import { graphFromData, toRequest } from '../utils/graphModel.js';
import { computeFrame } from '../utils/replay.js';
import { generateRandomGraph } from '../utils/randomGraph.js';

const live = Boolean(process.env.VITE_API_BASE);

describe.skipIf(!live)('frontend <-> C++ backend', () => {
  it('health endpoint answers', async () => {
    const h = await api.health();
    expect(h.status).toBe('ok');
  });

  for (const s of SAMPLES) {
    it(`sample "${s.id}": both algorithms agree and replay ends at the backend MST`, async () => {
      const req = toRequest(graphFromData(s.n, s.edges));
      const [k, p] = await Promise.all([api.runKruskal(req), api.runPrim(req)]);
      expect(k.totalWeight).toBe(p.totalWeight);
      expect(k.components).toBe(p.components);
      expect(k.forestSizeVerified && p.forestSizeVerified).toBe(true);
      for (const r of [k, p]) {
        const f = computeFrame(r, r.steps.length - 1);
        const accepted = Object.keys(f.edgeState).filter((id) => f.edgeState[id] === 'accepted').map(Number).sort((a, b) => a - b);
        expect(accepted).toEqual([...r.mstEdgeIds].sort((a, b) => a - b));
        expect(f.mstWeight).toBe(r.totalWeight);
      }
    });
  }

  it('random graphs (connected and disconnected) agree', async () => {
    for (let seed = 1; seed <= 25; seed++) {
      const g = generateRandomGraph({ vertices: 3 + (seed % 15), density: (seed % 10) / 10, minWeight: -50, maxWeight: 50, seed, connected: seed % 3 !== 0 });
      const req = toRequest(graphFromData(g.n, g.edges));
      const c = await api.compareAlgorithms(req);
      expect(c.weightsMatch).toBe(true);
      expect(c.kruskal.mstEdges.length).toBe(c.kruskal.vertices - c.kruskal.components);
    }
  });

  it('reports structured validation errors and client errors', async () => {
    await expect(api.runKruskal({ vertices: 2, edges: [{ source: 0, destination: 5, weight: 1 }] })).rejects.toMatchObject({ kind: 'validation' });
    await expect(api.runPrim({ vertices: 2, edges: [{ source: 0, destination: 1, weight: 1.5 }] })).rejects.toMatchObject({ kind: 'validation' });
  });

  it('classifies edges', async () => {
    const r = await api.classifyEdges({ vertices: 3, edges: [{ source: 0, destination: 1, weight: 1 }, { source: 1, destination: 2, weight: 1 }, { source: 0, destination: 2, weight: 1 }] });
    expect(r.counts.optional).toBe(3);
  });
});
