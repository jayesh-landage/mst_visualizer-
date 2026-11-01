import { useEffect, useRef, useState } from 'react';

// Small modal used both for new edges and for editing an existing edge's weight.
export default function WeightDialog({ title, description, initial = '', error, onSubmit, onCancel }) {
  const [value, setValue] = useState(String(initial));
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="weight-title" onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <form className="modal__card" onSubmit={(e) => { e.preventDefault(); onSubmit(value); }}>
        <h3 id="weight-title">{title}</h3>
        {description && <p className="muted">{description}</p>}
        <label className="field">
          <span>Edge weight</span>
          <input ref={ref} value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" aria-label="Edge weight" aria-invalid={Boolean(error)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn--primary">Save weight</button>
        </div>
      </form>
    </div>
  );
}
