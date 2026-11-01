const OPTIONS = [
  { id: 'kruskal', name: 'Kruskal', blurb: 'Sort edges, join components with a DSU.', cx: 'O(E log E)' },
  { id: 'prim', name: 'Prim', blurb: 'Grow one tree with a min-heap.', cx: 'O((V+E) log V)' },
];

export default function AlgorithmSelector({ value, onChange, disabled }) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Algorithm">
      {OPTIONS.map((o) => (
        <button
          key={o.id} type="button" role="radio" aria-checked={value === o.id} disabled={disabled}
          className={`segmented__item ${value === o.id ? 'is-active' : ''}`} onClick={() => onChange(o.id)}
        >
          <strong>{o.name}</strong>
          <small>{o.blurb}</small>
          <code>{o.cx}</code>
        </button>
      ))}
    </div>
  );
}
