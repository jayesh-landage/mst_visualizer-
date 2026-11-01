const ACTION_LABEL = {
  start: 'Start', consider: 'Considering edge', accept: 'Edge accepted', reject: 'Edge rejected', skip: 'Candidate skipped', finish: 'Finished',
};

export default function StepExplanation({ result, frame }) {
  if (!result) {
    return (
      <div className="panel empty" data-testid="step-empty">
        <h3>No steps yet</h3>
        <p>Pick an algorithm and choose “Run on C++ backend”. Each decision the algorithm makes will be explained here.</p>
      </div>
    );
  }
  const s = frame.step;
  return (
    <div className="panel step" aria-live="polite" data-testid="step-explanation">
      <div className="step__head">
        <span className={`badge badge--${s.action}`}>{ACTION_LABEL[s.action] ?? s.action}</span>
        <span className="muted">Step {s.index + 1} of {result.steps.length}</span>
      </div>
      <dl className="step__facts">
        {s.edgeId >= 0 && (<><dt>Edge</dt><dd data-testid="step-edge">{s.source} – {s.target}</dd><dt>Weight</dt><dd>{s.weight}</dd></>)}
        {s.vertex >= 0 && (<><dt>Vertex</dt><dd>{s.vertex}</dd></>)}
        <dt>MST weight</dt><dd data-testid="step-mst-weight">{s.mstWeight}</dd>
        <dt>Accepted edges</dt><dd data-testid="step-accepted">{s.accepted}</dd>
      </dl>
      <p className="step__reason" data-testid="step-reason">{s.reason}</p>
      {s.state && <p className="muted step__state">{s.state}</p>}
    </div>
  );
}
