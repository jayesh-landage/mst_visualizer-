import { useEffect, useMemo, useState } from 'react';
import { Loader2, Play as PlayIcon, TriangleAlert } from 'lucide-react';
import GraphCanvas from '../components/GraphCanvas.jsx';
import GraphControls from '../components/GraphControls.jsx';
import GraphInputPanel from '../components/GraphInputPanel.jsx';
import GraphLegend from '../components/GraphLegend.jsx';
import AlgorithmSelector from '../components/AlgorithmSelector.jsx';
import AnimationControls from '../components/AnimationControls.jsx';
import StepExplanation from '../components/StepExplanation.jsx';
import MSTResults from '../components/MSTResults.jsx';
import EdgeTable from '../components/EdgeTable.jsx';
import WeightDialog from '../components/WeightDialog.jsx';
import { computeFrame } from '../utils/replay.js';
import { buildReport, downloadText, resultToJsonText } from '../utils/graphExport.js';
import { graphSignature } from '../utils/graphModel.js';

export default function VisualizerPage({ view, g, mst, algorithm, setAlgorithm, anim, activeSample, onLoad }) {
  const { graph } = g;
  const [tool, setTool] = useState('select');
  const [selected, setSelected] = useState(null);
  const [edgeStart, setEdgeStart] = useState(null);
  const [dialog, setDialog] = useState(null); // { kind: 'new'|'edit', ... }
  const [dialogError, setDialogError] = useState('');
  const [editorMessage, setEditorMessage] = useState('');

  const run = mst.runs[algorithm];
  const sig = useMemo(() => graphSignature(graph), [graph]);
  const result = run && run.signature === sig ? run.data : null;
  const frame = useMemo(() => (result ? computeFrame(result, anim.index) : null), [result, anim.index]);
  const classes = useMemo(() => {
    const c = mst.classification;
    if (!c || c.signature !== sig) return null;
    const map = {};
    c.data.classes.forEach((x) => (map[x.id] = x.class));
    return map;
  }, [mst.classification, sig]);
  const staleRun = run && run.signature !== sig;

  // Selection / half-finished edge drawing must not outlive the vertices they refer to.
  useEffect(() => { setSelected(null); setEdgeStart(null); }, [graph.vertices.length]);
  useEffect(() => { if (tool !== 'edge') setEdgeStart(null); }, [tool]);
  useEffect(() => { if (view !== 'editor') setTool('select'); }, [view]);

  const editing = view === 'editor';

  const onCanvasClick = (p) => {
    if (!editing) return;
    if (tool === 'vertex') {
      const err = g.addVertex(p.x, p.y);
      setEditorMessage(err || '');
    } else {
      setSelected(null);
      setEdgeStart(null);
    }
  };
  const onVertexClick = (i) => {
    if (tool === 'edge' && editing) {
      if (edgeStart === null) { setEdgeStart(i); setEditorMessage(`Vertex ${i} chosen. Now click the second vertex.`); return; }
      if (edgeStart === i) { setEdgeStart(null); setEditorMessage(''); return; }
      setDialogError('');
      setDialog({ kind: 'new', a: edgeStart, b: i });
      return;
    }
    setSelected({ type: 'vertex', id: i });
  };
  const onEdgeClick = (uid) => setSelected({ type: 'edge', id: uid });
  const openEdit = (uid) => {
    const e = graph.edges.find((x) => x.uid === uid);
    if (!e || !editing) return;
    setSelected({ type: 'edge', id: uid });
    setDialogError('');
    setDialog({ kind: 'edit', uid, a: e.source, b: e.destination, initial: e.weight });
  };
  const submitDialog = (value) => {
    const err = dialog.kind === 'new' ? g.addEdge(dialog.a, dialog.b, value) : g.setWeight(dialog.uid, value);
    if (err) { setDialogError(err); return; }
    setDialog(null);
    setEdgeStart(null);
    setEditorMessage('');
  };
  const deleteSelected = () => {
    if (!selected) return;
    if (selected.type === 'vertex') g.deleteVertex(selected.id);
    else g.deleteEdge(selected.id);
    setSelected(null);
  };
  useEffect(() => {
    const onKey = (e) => {
      if (!editing || dialog) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) deleteSelected();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const empty = graph.vertices.length === 0;
  const canvas = (
    <GraphCanvas
      graph={graph} frame={editing ? null : frame} classes={classes} tool={tool} selected={selected} edgeStart={edgeStart}
      onCanvasClick={onCanvasClick} onVertexClick={onVertexClick} onEdgeClick={onEdgeClick} onEdgeEdit={openEdit}
      onDragStart={g.beginDrag} onMove={g.moveVertex}
      label={editing ? 'Graph editor canvas' : 'Algorithm visualization canvas'}
    />
  );

  const runPanel = (
    <div className="stack">
      <div className="panel">
        <h3>Algorithm</h3>
        <AlgorithmSelector value={algorithm} onChange={setAlgorithm} disabled={mst.loading} />
        <button type="button" className="btn btn--primary btn--wide" onClick={() => mst.run(algorithm, graph)} disabled={mst.loading || empty}>
          {mst.loading ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <PlayIcon size={16} aria-hidden="true" />}
          {mst.loading ? 'Running…' : 'Run on C++ backend'}
        </button>
        {empty && <p className="muted">Add a graph first, or load an example in the Graph Editor.</p>}
        {staleRun && <p className="muted">The graph changed since the last run. Run again for fresh steps.</p>}
        {mst.error && (
          <div className="alert" role="alert" data-testid="api-error">
            <TriangleAlert size={16} aria-hidden="true" />
            <div>
              <strong>{mst.error.message}</strong>
              {mst.error.details?.length > 0 && <ul>{mst.error.details.slice(0, 5).map((d, i) => <li key={i}>{d.message || String(d)}</li>)}</ul>}
            </div>
          </div>
        )}
      </div>
      <div className="panel">
        <h3>Playback</h3>
        <AnimationControls anim={anim} total={result?.steps.length ?? 0} disabled={mst.loading} />
      </div>
      <StepExplanation result={result} frame={frame} />
    </div>
  );

  return (
    <div className={`workspace workspace--${view}`}>
      {editing && (
        <aside className="workspace__left panel" aria-label="Graph input">
          <h2>Build a graph</h2>
          <GraphInputPanel graph={graph} onLoad={onLoad} activeSample={activeSample} />
        </aside>
      )}

      <section className="workspace__center" aria-label="Canvas">
        {editing && (
          <GraphControls
            tool={tool} setTool={setTool} selected={selected} onDelete={deleteSelected}
            onEditWeight={() => selected?.type === 'edge' && openEdit(selected.id)}
            onUndo={g.undo} onRedo={g.redo} canUndo={g.canUndo} canRedo={g.canRedo} onClear={g.clear} hasGraph={!empty}
          />
        )}
        <div className="canvas-card panel">
          {canvas}
          {editorMessage && editing && <p className="canvas-note" role="status">{editorMessage}</p>}
        </div>
        <GraphLegend />
        {!editing && frame && (
          <p className="muted" data-testid="canvas-caption">Step {anim.index + 1}: {frame.step.reason}</p>
        )}
        {!editing && (
          <>
            <MSTResults
              result={result}
              classifyLoading={mst.loading}
              onClassify={() => mst.classify(graph)}
              onDownloadJson={() => downloadText('mst-result.json', resultToJsonText(result, graph))}
              onDownloadReport={() => downloadText('mst-report.txt', buildReport(result, graph), 'text/plain')}
            />
            <EdgeTable graph={graph} frame={frame} classes={classes} selected={selected} onSelect={onEdgeClick} />
          </>
        )}
        {editing && <EdgeTable graph={graph} selected={selected} onSelect={onEdgeClick} />}
      </section>

      {!editing && <aside className="workspace__right" aria-label="Algorithm controls">{runPanel}</aside>}

      {dialog && (
        <WeightDialog
          title={dialog.kind === 'new' ? `Weight for edge ${dialog.a} – ${dialog.b}` : `Edit weight of edge ${dialog.a} – ${dialog.b}`}
          description="Whole numbers only. Negative and zero weights are allowed."
          initial={dialog.initial ?? ''} error={dialogError} onSubmit={submitDialog}
          onCancel={() => { setDialog(null); setEdgeStart(null); }}
        />
      )}
    </div>
  );
}
