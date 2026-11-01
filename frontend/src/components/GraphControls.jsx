import { useState } from 'react';
import { MousePointer2, CircleDot, Spline, Trash2, Undo2, Redo2, Eraser, Pencil } from 'lucide-react';

const TOOLS = [
  { id: 'select', label: 'Select / move', icon: MousePointer2, hint: 'Click to select. Drag vertices to move them.' },
  { id: 'vertex', label: 'Add vertex', icon: CircleDot, hint: 'Click an empty spot on the canvas to place a vertex.' },
  { id: 'edge', label: 'Add edge', icon: Spline, hint: 'Click one vertex, then another, to connect them.' },
];

export default function GraphControls({ tool, setTool, selected, onDelete, onEditWeight, onUndo, onRedo, canUndo, canRedo, onClear, hasGraph }) {
  const [confirming, setConfirming] = useState(false);
  const active = TOOLS.find((t) => t.id === tool);
  return (
    <div className="toolbar" role="toolbar" aria-label="Graph editing tools">
      <div className="toolbar__group">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={`btn btn--tool ${tool === id ? 'is-active' : ''}`} aria-pressed={tool === id} onClick={() => setTool(id)}>
            <Icon size={16} aria-hidden="true" /> <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="toolbar__group">
        <button type="button" className="btn btn--tool" onClick={onEditWeight} disabled={selected?.type !== 'edge'}>
          <Pencil size={16} aria-hidden="true" /> <span>Edit weight</span>
        </button>
        <button type="button" className="btn btn--tool" onClick={onDelete} disabled={!selected}>
          <Trash2 size={16} aria-hidden="true" /> <span>Delete selected</span>
        </button>
        <button type="button" className="btn btn--tool" onClick={onUndo} disabled={!canUndo} aria-label="Undo"><Undo2 size={16} aria-hidden="true" /></button>
        <button type="button" className="btn btn--tool" onClick={onRedo} disabled={!canRedo} aria-label="Redo"><Redo2 size={16} aria-hidden="true" /></button>
        {confirming ? (
          <span className="confirm" role="alertdialog" aria-label="Confirm clear">
            Clear the whole graph?
            <button type="button" className="btn btn--danger" onClick={() => { onClear(); setConfirming(false); }}>Yes, clear</button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>Keep</button>
          </span>
        ) : (
          <button type="button" className="btn btn--tool" onClick={() => setConfirming(true)} disabled={!hasGraph}>
            <Eraser size={16} aria-hidden="true" /> <span>Clear graph</span>
          </button>
        )}
      </div>
      <p className="toolbar__hint">{active.hint}</p>
    </div>
  );
}
