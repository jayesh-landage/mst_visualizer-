import GraphCanvas from './GraphCanvas.jsx';
import AnimationControls from './AnimationControls.jsx';
import GraphLegend from './GraphLegend.jsx';
import { computeFrame } from '../utils/replay.js';

export default function ComparisonPanel({ graph, compare, stale, onRun, loading, anim }) {
  if (!compare || stale) {
    return (
      <section className="panel empty" data-testid="compare-empty">
        <h3>{stale ? 'The graph changed' : 'Compare Kruskal and Prim'}</h3>
        <p>{stale ? 'Run the comparison again to see results for the current graph.' : 'Both algorithms run on the same graph in the C++ backend. You can step through them side by side.'}</p>
        <button type="button" className="btn btn--primary" onClick={onRun} disabled={loading || graph.vertices.length === 0}>{loading ? 'Running…' : 'Run both algorithms'}</button>
        {graph.vertices.length === 0 && <p className="muted">Add vertices in the Graph Editor first.</p>}
      </section>
    );
  }
  const { kruskal: k, prim: p } = compare;
  const rows = [
    ['Total weight', k.totalWeight, p.totalWeight],
    ['Edges in result', k.mstEdges.length, p.mstEdges.length],
    ['Components', k.components, p.components],
    ['Edges considered', k.metrics.considered, p.metrics.considered],
    ['Rejected / skipped', k.metrics.rejected, p.metrics.rejected],
    ['Recorded steps', k.metrics.stepCount, p.metrics.stepCount],
    ['Backend time (µs)', k.metrics.durationMicros, p.metrics.durationMicros],
  ];
  const total = Math.max(k.steps.length, p.steps.length);
  return (
    <div className="compare">
      <section className="panel">
        <p className={`banner ${compare.weightsMatch ? 'banner--ok' : 'banner--bad'}`} data-testid="weights-match">
          {compare.weightsMatch ? `Both algorithms found the same minimum total weight: ${k.totalWeight}.` : 'The total weights differ. This should never happen, so please report it.'}
          {' '}{compare.sameEdgeSet ? 'They also chose the same edges.' : 'They chose different edges, which is fine when several MSTs tie.'}
        </p>
        <AnimationControls anim={anim} total={total} />
        <GraphLegend />
      </section>
      <div className="compare__grid">
        {[['Kruskal', k], ['Prim', p]].map(([name, r]) => {
          const frame = computeFrame(r, anim.index);
          return (
            <section className="panel" key={name} aria-label={`${name} visualization`}>
              <h3>{name} <span className="muted">step {Math.min(anim.index, r.steps.length - 1) + 1}/{r.steps.length} · weight {frame.mstWeight}</span></h3>
              <GraphCanvas graph={graph} frame={frame} readOnly label={`${name} result`} />
              <p className="muted compare__reason">{frame.step?.reason}</p>
            </section>
          );
        })}
      </div>
      <section className="panel">
        <h3>Metrics</h3>
        <div className="table-wrap">
          <table className="table" data-testid="compare-table">
            <thead><tr><th /><th>Kruskal</th><th>Prim</th></tr></thead>
            <tbody>{rows.map(([n, a, b]) => <tr key={n}><th scope="row">{n}</th><td>{a}</td><td>{b}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
