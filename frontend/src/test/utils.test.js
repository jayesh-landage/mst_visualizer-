import { describe, it, expect } from 'vitest';
import {
  addEdge, addVertex, emptyGraph, graphFromData, moveVertex, parseWeight, removeEdge, removeVertex, toRequest, updateEdgeWeight,
} from '../utils/graphModel.js';
import { edgeListText, matrixText, parseEdgeList, parseGraphJson, parseMatrix } from '../utils/graphParsers.js';
import { generateRandomGraph, validateRandomOptions } from '../utils/randomGraph.js';
import { SAMPLES } from '../utils/samples.js';
import { computeFrame } from '../utils/replay.js';
import { buildReport, graphToJsonText } from '../utils/graphExport.js';
import kruskalFx from './fixtures/beginner-kruskal.json';
import primFx from './fixtures/beginner-prim.json';
import disKruskal from './fixtures/disconnected-kruskal.json';

describe('graphModel', () => {
  it('adds and removes vertices, renumbering edges', () => {
    let g = emptyGraph();
    for (let i = 0; i < 3; i++) g = addVertex(g, 10 * i, 10).graph;
    g = addEdge(g, 0, 1, '5').graph;
    g = addEdge(g, 1, 2, '-3').graph;
    g = addEdge(g, 0, 2, '0').graph;
    expect(g.edges).toHaveLength(3);
    g = removeVertex(g, 1);
    expect(g.vertices).toHaveLength(2);
    expect(g.edges).toHaveLength(1);
    expect(toRequest(g)).toEqual({ vertices: 2, edges: [{ source: 0, destination: 1, weight: 0 }] });
  });
  it('prevents duplicate edges and self-loops, allows negative and zero weights', () => {
    let g = emptyGraph();
    g = addVertex(addVertex(g, 1, 1).graph, 5, 5).graph;
    expect(addEdge(g, 0, 0, '1').error).toMatch(/Self-loops/);
    g = addEdge(g, 0, 1, '-7').graph;
    expect(addEdge(g, 1, 0, '2').error).toMatch(/already connected/);
    expect(g.edges[0].weight).toBe(-7);
    expect(addEdge(emptyGraph(), 0, 1, '1').error).toBeTruthy();
  });
  it('edits and removes edges', () => {
    let g = graphFromData(2, [{ source: 0, destination: 1, weight: 4 }]);
    g = updateEdgeWeight(g, 1, '9').graph;
    expect(g.edges[0].weight).toBe(9);
    expect(updateEdgeWeight(g, 1, 'x').error).toBeTruthy();
    expect(removeEdge(g, 1).edges).toHaveLength(0);
  });
  it('validates weights', () => {
    expect(parseWeight('12').value).toBe(12);
    expect(parseWeight(' -4 ').value).toBe(-4);
    expect(parseWeight('1.5').ok).toBe(false);
    expect(parseWeight('').ok).toBe(false);
    expect(parseWeight('9999999999999').ok).toBe(false);
  });
  it('keeps dragged vertices inside the canvas', () => {
    const g = moveVertex(graphFromData(1, []), 0, -50, 9999);
    expect(g.vertices[0].x).toBeGreaterThanOrEqual(24);
    expect(g.vertices[0].y).toBeLessThanOrEqual(560 - 24);
  });
});

describe('parsers', () => {
  it('parses the documented edge list', () => {
    const r = parseEdgeList('5 7\n0 1 2\n0 2 4\n1 2 1\n1 3 7\n2 3 3\n2 4 5\n3 4 6');
    expect(r.ok).toBe(true);
    expect(r.n).toBe(5);
    expect(r.edges).toHaveLength(7);
    expect(r.edges[2]).toEqual({ source: 1, destination: 2, weight: 1 });
  });
  it('reports edge list problems with line numbers', () => {
    expect(parseEdgeList('').ok).toBe(false);
    expect(parseEdgeList('3 2\n0 1 5').errors[0]).toMatch(/promises 2 edges/);
    expect(parseEdgeList('3 1\n0 1 x').errors[0]).toMatch(/Line 2/);
    expect(parseEdgeList('3 1\n0 5 1').errors[0]).toMatch(/not a vertex/);
    expect(parseEdgeList('3 2\n0 1 1\n1 0 2').errors.join(' ')).toMatch(/duplicates/);
    expect(parseEdgeList('3 1\n1 1 1').errors.join(' ')).toMatch(/self-loops/);
  });
  it('parses matrices where INF means no edge and 0 is a real edge', () => {
    const r = parseMatrix('0 0 INF\n0 0 3\nINF 3 0');
    expect(r.ok).toBe(true);
    expect(r.edges).toEqual([{ source: 0, destination: 1, weight: 0 }, { source: 1, destination: 2, weight: 3 }]);
  });
  it('rejects bad matrices', () => {
    expect(parseMatrix('0 1\n0').errors[0]).toMatch(/square/);
    expect(parseMatrix('0 1\n2 0').errors[0]).toMatch(/not symmetric/);
    expect(parseMatrix('0 abc\nabc 0').errors[0]).toMatch(/not a whole number/);
    expect(parseMatrix('5 1\n1 0').errors[0]).toMatch(/diagonal/);
  });
  it('round-trips text and JSON', () => {
    const s = SAMPLES.find((x) => x.id === 'classic');
    const g = graphFromData(s.n, s.edges);
    const e = parseEdgeList(edgeListText(g));
    expect(e.ok && e.edges.length).toBe(s.edges.length);
    const m = parseMatrix(matrixText(g));
    expect(m.ok && m.edges.length).toBe(s.edges.length);
    const j = parseGraphJson(graphToJsonText(g));
    expect(j.ok).toBe(true);
    expect(j.positions).toHaveLength(s.n);
  });
  it('rejects invalid JSON imports', () => {
    expect(parseGraphJson('{oops').errors[0]).toMatch(/valid JSON/);
    expect(parseGraphJson('[]').ok).toBe(false);
    expect(parseGraphJson('{"vertices":"3","edges":[]}').ok).toBe(false);
    expect(parseGraphJson('{"vertices":2,"edges":[{"source":0,"destination":1}]}').ok).toBe(false);
  });
});

describe('samples and random graphs', () => {
  it('ships all six example graphs with valid data', () => {
    expect(SAMPLES.map((s) => s.id)).toEqual(['beginner', 'classic', 'multiple', 'negative', 'disconnected', 'dense']);
    SAMPLES.forEach((s) => expect(parseEdgeList(`${s.n} ${s.edges.length}\n${s.edges.map((e) => `${e.source} ${e.destination} ${e.weight}`).join('\n')}`).ok).toBe(true));
    expect(SAMPLES.find((s) => s.id === 'negative').edges.some((e) => e.weight < 0)).toBe(true);
    expect(SAMPLES.find((s) => s.id === 'dense').edges.length).toBe(276);
  });
  const components = (n, edges) => {
    const p = [...Array(n).keys()];
    const f = (x) => (p[x] === x ? x : (p[x] = f(p[x])));
    edges.forEach((e) => (p[f(e.source)] = f(e.destination)));
    return new Set(p.map((_, i) => f(i))).size;
  };
  it('is deterministic for a seed and respects connectivity', () => {
    const o = { vertices: 15, density: 0.2, minWeight: -5, maxWeight: 9, seed: 7, connected: true };
    const a = generateRandomGraph(o), b = generateRandomGraph(o);
    expect(a.edges).toEqual(b.edges);
    expect(components(a.n, a.edges)).toBe(1);
    expect(a.edges.every((e) => e.weight >= -5 && e.weight <= 9)).toBe(true);
    for (let seed = 0; seed < 20; seed++) {
      const d = generateRandomGraph({ ...o, connected: false, seed });
      expect(components(d.n, d.edges)).toBeGreaterThanOrEqual(2);
    }
  });
  it('rejects invalid options', () => {
    const ok = { vertices: 5, density: 0.5, minWeight: 1, maxWeight: 5, seed: 1, connected: true };
    expect(validateRandomOptions({ ...ok, vertices: 1000 })).not.toEqual([]);
    expect(validateRandomOptions({ ...ok, minWeight: 9 })).not.toEqual([]);
    expect(validateRandomOptions({ ...ok, density: 2 })).not.toEqual([]);
    expect(validateRandomOptions({ ...ok, vertices: 1, connected: false })).not.toEqual([]);
    expect(generateRandomGraph({ ...ok, vertices: 0 }).ok).toBe(false);
  });
});

describe('replay of backend steps', () => {
  it('Kruskal: final frame equals the backend MST', () => {
    const last = kruskalFx.steps.length - 1;
    const f = computeFrame(kruskalFx, last);
    const accepted = Object.entries(f.edgeState).filter(([, s]) => s === 'accepted').map(([id]) => Number(id)).sort();
    expect(accepted).toEqual([...kruskalFx.mstEdgeIds].sort());
    expect(f.mstWeight).toBe(kruskalFx.totalWeight);
    expect(f.accepted).toBe(kruskalFx.mstEdges.length);
  });
  it('Kruskal: going backward restores earlier frames without recomputation', () => {
    const mid = computeFrame(kruskalFx, 3);
    computeFrame(kruskalFx, kruskalFx.steps.length - 1);
    expect(computeFrame(kruskalFx, 3)).toEqual(mid);
    const first = computeFrame(kruskalFx, 0);
    expect(Object.keys(first.edgeState)).toHaveLength(0);
  });
  it('highlights the edge under consideration, then colours it by the decision', () => {
    const i = kruskalFx.steps.findIndex((s) => s.action === 'consider');
    expect(computeFrame(kruskalFx, i).edgeState[kruskalFx.steps[i].edgeId]).toBe('current');
    expect(['accepted', 'rejected']).toContain(computeFrame(kruskalFx, i + 1).edgeState[kruskalFx.steps[i].edgeId]);
  });
  it('Prim: tracks visited vertices and the heap frontier', () => {
    const f0 = computeFrame(primFx, 0);
    expect(f0.vertexState[0]).toBeDefined();
    expect(f0.frontier.length).toBeGreaterThan(0);
    const end = computeFrame(primFx, primFx.steps.length - 1);
    expect(Object.keys(end.vertexState).length).toBeGreaterThanOrEqual(primFx.vertices - 1);
    expect(end.frontier).toEqual([]);
    expect(end.mstWeight).toBe(primFx.totalWeight);
  });
  it('clamps out-of-range indexes and tolerates missing results', () => {
    expect(computeFrame(kruskalFx, 9999).step.action).toBe('finish');
    expect(computeFrame(kruskalFx, -4).step.index).toBe(0);
    expect(computeFrame(null, 0).step).toBeNull();
  });
  it('disconnected forest result has V - C edges', () => {
    expect(disKruskal.isConnected).toBe(false);
    expect(disKruskal.mstEdges.length).toBe(disKruskal.vertices - disKruskal.components);
  });
});

describe('export', () => {
  it('builds a readable report', () => {
    const g = graphFromData(4, SAMPLES[0].edges);
    const report = buildReport(kruskalFx, g);
    expect(report).toMatch(/Kruskal/);
    expect(report).toMatch(/Total weight: 6/);
    expect(report).toMatch(/O\(E log E\)/);
  });
});
