import { useCallback, useEffect, useMemo, useState } from 'react';
import { GitBranch, Moon, Sun, Network, BookOpen, Columns2, PencilRuler } from 'lucide-react';
import VisualizerPage from './pages/VisualizerPage.jsx';
import ComparisonPanel from './components/ComparisonPanel.jsx';
import EducationalPanel from './components/EducationalPanel.jsx';
import { useGraph } from './hooks/useGraph.js';
import { useMST } from './hooks/useMST.js';
import { useAnimation } from './hooks/useAnimation.js';
import { graphFromData, graphSignature } from './utils/graphModel.js';
import { SAMPLES } from './utils/samples.js';

const NAV = [
  ['editor', 'Graph Editor', PencilRuler],
  ['visualizer', 'Visualizer', Network],
  ['compare', 'Algorithm Comparison', Columns2],
  ['learn', 'Learn', BookOpen],
];

export default function App() {
  const first = SAMPLES.find((s) => s.id === 'classic');
  const g = useGraph(useMemo(() => graphFromData(first.n, first.edges), [])); // eslint-disable-line react-hooks/exhaustive-deps
  const mst = useMST();
  const [view, setView] = useState('editor');
  const [algorithm, setAlgorithm] = useState('kruskal');
  const [activeSample, setActiveSample] = useState('classic');
  const [theme, setTheme] = useState(() => (typeof localStorage !== 'undefined' && localStorage.getItem('mst-theme')) || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('mst-theme', theme); } catch { /* storage unavailable */ }
  }, [theme]);

  const sig = useMemo(() => graphSignature(g.graph), [g.graph]);
  const run = mst.runs[algorithm];
  const result = run && run.signature === sig ? run.data : null;
  const compare = mst.compare && mst.compare.signature === sig ? mst.compare.data : null;
  const compareStale = Boolean(mst.compare) && !compare;

  // Single animation: Visualizer uses the selected algorithm's steps, Comparison uses the longer of both.
  const total = view === 'compare' ? (compare ? Math.max(compare.kruskal.steps.length, compare.prim.steps.length) : 0) : (result?.steps.length ?? 0);
  const anim = useAnimation(total, `${sig}|${algorithm}|${view}|${run?.signature ?? ''}|${mst.compare?.signature ?? ''}`);

  const onLoad = useCallback((n, edges, positions, label) => {
    g.loadData(n, edges, positions);
    setActiveSample(SAMPLES.some((s) => s.id === label) ? label : null);
  }, [g.loadData]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><GitBranch size={22} aria-hidden="true" /><span>MST Studio</span></div>
        <nav className="nav" aria-label="Main">
          {NAV.map(([id, label, Icon]) => (
            <button key={id} type="button" className={`nav__item ${view === id ? 'is-active' : ''}`} aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>
              <Icon size={16} aria-hidden="true" /> <span>{label}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="btn btn--icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className="main">
        {(view === 'editor' || view === 'visualizer') && (
          <VisualizerPage view={view} g={g} mst={mst} algorithm={algorithm} setAlgorithm={setAlgorithm} anim={anim} activeSample={activeSample} onLoad={onLoad} />
        )}
        {view === 'compare' && (
          <>
            {mst.error && <div className="alert" role="alert"><strong>{mst.error.message}</strong></div>}
            <ComparisonPanel graph={g.graph} compare={compare} stale={compareStale} loading={mst.loading} onRun={() => mst.runCompare(g.graph)} anim={anim} />
            {compare && <div className="row-actions"><button type="button" className="btn" onClick={() => mst.runCompare(g.graph)} disabled={mst.loading}>Run again</button></div>}
          </>
        )}
        {view === 'learn' && <EducationalPanel />}
      </main>
    </div>
  );
}
