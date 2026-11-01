import { useState } from 'react';
import { Plus, X, Upload, Download, Dices } from 'lucide-react';
import { SAMPLES } from '../utils/samples.js';
import { edgeListText, matrixText, parseEdgeList, parseGraphJson, parseMatrix } from '../utils/graphParsers.js';
import { validateGraphData } from '../utils/graphValidation.js';
import { generateRandomGraph, RANDOM_LIMITS } from '../utils/randomGraph.js';
import { downloadText, graphToJsonText } from '../utils/graphExport.js';

const TABS = [
  ['examples', 'Examples'], ['manual', 'Manual'], ['edgelist', 'Edge list'], ['matrix', 'Matrix'], ['json', 'JSON'], ['random', 'Random'],
];
const SAMPLE_EDGE_LIST = '5 7\n0 1 2\n0 2 4\n1 2 1\n1 3 7\n2 3 3\n2 4 5\n3 4 6';
const SAMPLE_MATRIX = '0 2 4 INF INF\n2 0 1 7 INF\n4 1 0 3 5\nINF 7 3 0 6\nINF INF 5 6 0';

function Errors({ errors }) {
  if (!errors.length) return null;
  return (
    <ul className="error-list" role="alert">
      {errors.map((e, i) => <li key={i}>{e}</li>)}
    </ul>
  );
}

export default function GraphInputPanel({ graph, onLoad, activeSample }) {
  const [tab, setTab] = useState('examples');
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');

  const [manualN, setManualN] = useState('4');
  const [rows, setRows] = useState([{ source: '0', destination: '1', weight: '1' }, { source: '1', destination: '2', weight: '2' }]);
  const [edgeText, setEdgeText] = useState(SAMPLE_EDGE_LIST);
  const [matrix, setMatrix] = useState(SAMPLE_MATRIX);
  const [jsonText, setJsonText] = useState('');
  const [rnd, setRnd] = useState({ vertices: '8', density: '0.4', minWeight: '1', maxWeight: '20', seed: '42', connected: true });

  const switchTab = (t) => { setTab(t); setErrors([]); setNotice(''); };
  const apply = (parsed, label) => {
    if (!parsed.ok) { setErrors(parsed.errors); setNotice(''); return; }
    setErrors([]);
    onLoad(parsed.n, parsed.edges, parsed.positions, label);
    setNotice(`Loaded ${parsed.n} vertices and ${parsed.edges.length} edges.`);
  };

  const submitManual = (e) => {
    e.preventDefault();
    const n = Number(manualN);
    const toInt = (s) => (/^\s*[-+]?\d+\s*$/.test(s) ? Number(s) : NaN);
    const edges = rows.map((r) => ({ source: toInt(r.source), destination: toInt(r.destination), weight: toInt(r.weight) }));
    const errs = validateGraphData(Number.isInteger(n) && manualN.trim() !== '' ? n : NaN, edges);
    if (errs.length) setErrors(errs);
    else apply({ ok: true, n, edges }, 'manual');
  };

  const importFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((t) => { setJsonText(t); apply(parseGraphJson(t), 'json'); }, () => setErrors(['The file could not be read.']));
    e.target.value = '';
  };

  const generate = (seedOverride) => {
    const opts = {
      vertices: Number(rnd.vertices), density: Number(rnd.density), minWeight: Number(rnd.minWeight), maxWeight: Number(rnd.maxWeight),
      seed: seedOverride ?? Number(rnd.seed), connected: rnd.connected,
    };
    const r = generateRandomGraph(opts);
    if (seedOverride !== undefined) setRnd((s) => ({ ...s, seed: String(seedOverride) }));
    apply(r, 'random');
  };

  return (
    <div className="inputs">
      <div className="tabs" role="tablist" aria-label="Graph input method">
        {TABS.map(([id, name]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'is-active' : ''}`} onClick={() => switchTab(id)}>{name}</button>
        ))}
      </div>

      <div className="inputs__body" role="tabpanel">
        {tab === 'examples' && (
          <ul className="samples">
            {SAMPLES.map((s) => (
              <li key={s.id}>
                <button type="button" className={`sample ${activeSample === s.id ? 'is-active' : ''}`} onClick={() => { onLoad(s.n, s.edges, undefined, s.id); setNotice(`Loaded “${s.name}”.`); }}>
                  <strong>{s.name}</strong>
                  <small>{s.description}</small>
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === 'manual' && (
          <form onSubmit={submitManual} className="stack">
            <label className="field"><span>Number of vertices</span>
              <input value={manualN} onChange={(e) => setManualN(e.target.value)} inputMode="numeric" aria-label="Number of vertices" />
            </label>
            <div className="rows">
              <div className="rows__head"><span>Source</span><span>Destination</span><span>Weight</span><span /></div>
              {rows.map((r, i) => (
                <div className="rows__row" key={i}>
                  {['source', 'destination', 'weight'].map((k) => (
                    <input key={k} value={r[k]} aria-label={`Edge ${i + 1} ${k}`} inputMode="numeric"
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                  ))}
                  <button type="button" className="btn btn--icon" aria-label={`Remove edge ${i + 1}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}><X size={14} /></button>
                </div>
              ))}
            </div>
            <div className="row-actions">
              <button type="button" className="btn" onClick={() => setRows([...rows, { source: '', destination: '', weight: '' }])}><Plus size={14} aria-hidden="true" /> Add edge</button>
              <button type="submit" className="btn btn--primary">Build graph</button>
            </div>
            <p className="muted">Vertices are numbered from 0. Weights may be negative or zero.</p>
          </form>
        )}

        {tab === 'edgelist' && (
          <div className="stack">
            <p className="muted">First line: <code>vertices edges</code>. Then one edge per line: <code>source destination weight</code>. Vertices are numbered from <strong>0</strong>. Lines starting with # are ignored.</p>
            <textarea className="code" rows={9} value={edgeText} onChange={(e) => setEdgeText(e.target.value)} aria-label="Edge list" spellCheck={false} />
            <div className="row-actions">
              <button type="button" className="btn" onClick={() => setEdgeText(edgeListText(graph))} disabled={!graph.vertices.length}>Use current graph</button>
              <button type="button" className="btn btn--primary" onClick={() => apply(parseEdgeList(edgeText), 'edgelist')}>Load edge list</button>
            </div>
          </div>
        )}

        {tab === 'matrix' && (
          <div className="stack">
            <p className="muted">A square, symmetric matrix of weights. Write <code>INF</code> where there is no edge: <code>0</code> is a real zero-weight edge (the diagonal is ignored).</p>
            <textarea className="code" rows={7} value={matrix} onChange={(e) => setMatrix(e.target.value)} aria-label="Adjacency matrix" spellCheck={false} />
            <div className="row-actions">
              <button type="button" className="btn" onClick={() => setMatrix(matrixText(graph))} disabled={!graph.vertices.length}>Use current graph</button>
              <button type="button" className="btn btn--primary" onClick={() => apply(parseMatrix(matrix), 'matrix')}>Load matrix</button>
            </div>
          </div>
        )}

        {tab === 'json' && (
          <div className="stack">
            <p className="muted">Paste a graph exported from MST Studio, or import a .json file.</p>
            <textarea className="code" rows={7} value={jsonText} onChange={(e) => setJsonText(e.target.value)} aria-label="Graph JSON" spellCheck={false}
              placeholder={'{"vertices": 3, "edges": [{"source": 0, "destination": 1, "weight": 2}]}'} />
            <div className="row-actions">
              <button type="button" className="btn btn--primary" onClick={() => apply(parseGraphJson(jsonText), 'json')}>Load JSON</button>
              <label className="btn"><Upload size={14} aria-hidden="true" /> Import file<input type="file" accept="application/json,.json" onChange={importFile} hidden aria-label="Import graph file" /></label>
              <button type="button" className="btn" onClick={() => downloadText('graph.json', graphToJsonText(graph))} disabled={!graph.vertices.length}><Download size={14} aria-hidden="true" /> Export graph</button>
            </div>
          </div>
        )}

        {tab === 'random' && (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); generate(); }}>
            <div className="grid2">
              <label className="field"><span>Vertices (1–{RANDOM_LIMITS.maxVertices})</span><input value={rnd.vertices} onChange={(e) => setRnd({ ...rnd, vertices: e.target.value })} aria-label="Random vertices" inputMode="numeric" /></label>
              <label className="field"><span>Seed</span><input value={rnd.seed} onChange={(e) => setRnd({ ...rnd, seed: e.target.value })} aria-label="Random seed" inputMode="numeric" /></label>
              <label className="field"><span>Min weight</span><input value={rnd.minWeight} onChange={(e) => setRnd({ ...rnd, minWeight: e.target.value })} aria-label="Minimum weight" inputMode="numeric" /></label>
              <label className="field"><span>Max weight</span><input value={rnd.maxWeight} onChange={(e) => setRnd({ ...rnd, maxWeight: e.target.value })} aria-label="Maximum weight" inputMode="numeric" /></label>
            </div>
            <label className="field"><span>Edge density: {Math.round(Number(rnd.density) * 100)}%</span>
              <input type="range" min="0" max="1" step="0.05" value={rnd.density} onChange={(e) => setRnd({ ...rnd, density: e.target.value })} aria-label="Edge density" />
            </label>
            <label className="check-row"><input type="checkbox" checked={rnd.connected} onChange={(e) => setRnd({ ...rnd, connected: e.target.checked })} /> Always connected (uncheck for a disconnected graph)</label>
            <div className="row-actions">
              <button type="button" className="btn" onClick={() => generate(Math.floor(Math.random() * 100000))}><Dices size={14} aria-hidden="true" /> New seed</button>
              <button type="submit" className="btn btn--primary">Generate</button>
            </div>
          </form>
        )}

        <Errors errors={errors} />
        {notice && !errors.length && <p className="notice" role="status">{notice}</p>}
      </div>
    </div>
  );
}
