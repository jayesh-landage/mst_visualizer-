import { Download, FileText, Network } from 'lucide-react';

const algoName = (a) => (a === 'kruskal' ? "Kruskal's algorithm" : "Prim's algorithm");

export default function MSTResults({ result, onDownloadJson, onDownloadReport, onClassify, classifyLoading }) {
  if (!result) {
    return (
      <section className="panel empty" aria-label="Results">
        <h3>Results appear here</h3>
        <p>Run an algorithm to see total weight, components, and how much work the C++ backend did.</p>
      </section>
    );
  }
  const m = result.metrics;
  const stats = [
    ['Algorithm', algoName(result.algorithm)],
    ['Vertices', result.vertices],
    ['Edges in graph', result.edgeCount],
    [result.isConnected ? 'Edges in MST' : 'Edges in forest', result.mstEdges.length],
    ['Connected components', result.components],
    [result.isConnected ? 'MST total weight' : 'Forest total weight', result.totalWeight],
    ['Backend time', `${m.durationMicros} µs`],
    ['Edges considered', m.considered],
    ['Edges accepted', m.accepted],
    [result.algorithm === 'prim' ? 'Candidates skipped' : 'Edges rejected', m.rejected],
    ['Single MST exists', result.isConnected ? 'Yes' : 'No'],
    ['Recorded steps', m.stepCount],
  ];
  return (
    <section className="panel results" aria-label="Results">
      <header className="results__head">
        <h3>{result.isConnected ? 'Minimum spanning tree' : result.vertices === 0 ? 'Empty graph' : 'Minimum spanning forest'}</h3>
        <div className="results__actions">
          <button type="button" className="btn" onClick={onDownloadJson}><Download size={15} aria-hidden="true" /> Results JSON</button>
          <button type="button" className="btn" onClick={onDownloadReport}><FileText size={15} aria-hidden="true" /> Report</button>
          <button type="button" className="btn" onClick={onClassify} disabled={classifyLoading}><Network size={15} aria-hidden="true" /> Classify edges</button>
        </div>
      </header>
      <p className={`results__summary ${result.isConnected ? '' : 'is-warning'}`} data-testid="result-summary">{result.summary}</p>
      <p className={`check ${result.forestSizeVerified ? 'check--ok' : 'check--bad'}`}>
        {result.forestSizeVerified
          ? `Verified: ${result.mstEdges.length} edges = V − C (${result.vertices} − ${result.components}).`
          : `Check failed: expected ${result.expectedEdges} edges but found ${result.mstEdges.length}.`}
      </p>
      <dl className="stats">
        {stats.map(([k, v]) => (
          <div key={k} className="stats__item"><dt>{k}</dt><dd data-testid={`stat-${k.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{v}</dd></div>
        ))}
      </dl>
    </section>
  );
}
