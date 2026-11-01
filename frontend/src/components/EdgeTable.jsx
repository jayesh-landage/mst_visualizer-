const STATUS = { accepted: 'Accepted', rejected: 'Rejected', current: 'Considering', candidate: 'Candidate' };
const CLASS = { critical: 'In every MST', optional: 'In some MSTs', excluded: 'In no MST' };

export default function EdgeTable({ graph, frame, classes, selected, onSelect }) {
  if (graph.edges.length === 0) return <section className="panel empty"><h3>No edges yet</h3><p>Connect two vertices to see them listed here.</p></section>;
  return (
    <section className="panel" aria-label="Edge table">
      <h3>Edges</h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>#</th><th>Edge</th><th>Weight</th>{frame && <th>Status</th>}{classes && <th>MST role</th>}</tr></thead>
          <tbody>
            {graph.edges.map((e, k) => {
              const st = frame?.edgeState[k];
              return (
                <tr key={e.uid} className={selected?.type === 'edge' && selected.id === e.uid ? 'is-selected' : ''} onClick={() => onSelect?.(e.uid)}>
                  <td>{k}</td><td>{e.source} – {e.destination}</td><td>{e.weight}</td>
                  {frame && <td>{st ? <span className={`pill pill--${st}`}>{STATUS[st]}</span> : <span className="muted">—</span>}</td>}
                  {classes && <td><span className={`pill pill--class-${classes[k]}`}>{CLASS[classes[k]]}</span></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
