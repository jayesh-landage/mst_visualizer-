const EDGE_ITEMS = [
  ['edge-normal', 'Normal edge'],
  ['edge-candidate', 'Candidate (on the heap)'],
  ['edge-current', 'Under consideration'],
  ['edge-accepted', 'Accepted MST edge'],
  ['edge-rejected', 'Rejected or skipped'],
];
const VERTEX_ITEMS = [
  ['vertex-normal', 'Unvisited vertex'],
  ['vertex-visited', 'Visited vertex'],
  ['vertex-current', 'Current vertex'],
];

export default function GraphLegend() {
  return (
    <div className="legend" aria-label="Legend">
      {EDGE_ITEMS.map(([k, t]) => (
        <span key={k} className="legend__item"><i className={`swatch swatch--line ${k}`} />{t}</span>
      ))}
      {VERTEX_ITEMS.map(([k, t]) => (
        <span key={k} className="legend__item"><i className={`swatch swatch--dot ${k}`} />{t}</span>
      ))}
    </div>
  );
}
