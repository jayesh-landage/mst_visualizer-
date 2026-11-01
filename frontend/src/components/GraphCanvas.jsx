import { useRef } from 'react';
import { CANVAS } from '../utils/graphModel.js';

// Converts a pointer event to SVG viewBox coordinates. Falls back to raw client coords when layout is unavailable (tests).
export function toSvgPoint(evt, svg) {
  const rect = svg.getBoundingClientRect();
  if (!rect || rect.width === 0) return { x: evt.clientX ?? 0, y: evt.clientY ?? 0 };
  return {
    x: ((evt.clientX - rect.left) / rect.width) * CANVAS.width,
    y: ((evt.clientY - rect.top) / rect.height) * CANVAS.height,
  };
}

const HIDE_WEIGHTS_ABOVE = 90;

export default function GraphCanvas({
  graph, frame = null, tool = 'select', selected = null, edgeStart = null, classes = null,
  readOnly = false, onCanvasClick, onVertexClick, onEdgeClick, onEdgeEdit, onDragStart, onMove, label = 'Graph canvas',
}) {
  const svgRef = useRef(null);
  const drag = useRef(null);
  const { vertices, edges } = graph;
  const showAllWeights = edges.length <= HIDE_WEIGHTS_ABOVE;

  const handleMove = (e) => {
    const d = drag.current;
    if (!d || readOnly) return;
    const p = toSvgPoint(e, svgRef.current);
    if (!d.moved) {
      if (Math.hypot(p.x - d.start.x, p.y - d.start.y) < 4) return;
      d.moved = true;
      onDragStart?.();
    }
    onMove?.(d.index, p.x, p.y);
  };
  const suppress = useRef(false);
  const endDrag = () => {
    if (drag.current?.moved) {
      suppress.current = true; // the click that follows a drag must not select / connect
      setTimeout(() => { suppress.current = false; }, 0);
    }
    drag.current = null;
  };

  const startDrag = (e, index) => {
    if (readOnly || tool !== 'select') return;
    drag.current = { index, moved: false, start: toSvgPoint(e, svgRef.current) };
  };

  const vertexClick = (e, i) => {
    e.stopPropagation();
    if (suppress.current) return;
    onVertexClick?.(i);
  };

  const stateOf = (k) => (frame ? frame.edgeState[k] : undefined);

  return (
    <svg
      ref={svgRef}
      className={`canvas canvas--${readOnly ? 'readonly' : tool}`}
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      role="img"
      aria-label={label}
      data-testid="graph-canvas"
      onClick={(e) => { if (!readOnly) onCanvasClick?.(toSvgPoint(e, svgRef.current)); }}
      onPointerMove={handleMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <rect data-bg width={CANVAS.width} height={CANVAS.height} className="canvas__bg" />
      {vertices.length === 0 && (
        <text x={CANVAS.width / 2} y={CANVAS.height / 2} textAnchor="middle" className="canvas__empty">
          {readOnly ? 'No graph yet' : 'Choose “Add vertex”, then click here to place vertices'}
        </text>
      )}

      <g>
        {edges.map((e, k) => {
          const a = vertices[e.source], b = vertices[e.destination];
          if (!a || !b) return null;
          const st = stateOf(k);
          const isSel = selected?.type === 'edge' && selected.id === e.uid;
          const cls = classes?.[k];
          return (
            <g key={e.uid} className={`edge ${st ? `edge--${st}` : ''} ${cls ? `edge--class-${cls}` : ''} ${isSel ? 'is-selected' : ''}`} data-testid={`edge-${k}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="edge__line" />
              <line
                x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="edge__hit"
                onClick={(ev) => { ev.stopPropagation(); onEdgeClick?.(e.uid); }}
                onDoubleClick={(ev) => { ev.stopPropagation(); onEdgeEdit?.(e.uid); }}
              />
            </g>
          );
        })}
      </g>

      <g>
        {edges.map((e, k) => {
          const a = vertices[e.source], b = vertices[e.destination];
          if (!a || !b) return null;
          const st = stateOf(k);
          const isSel = selected?.type === 'edge' && selected.id === e.uid;
          if (!showAllWeights && !st && !isSel) return null;
          if (!showAllWeights && st === 'candidate') return null;
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const text = String(e.weight);
          const w = Math.max(26, text.length * 8 + 12);
          return (
            <g
              key={e.uid}
              className={`weight ${st ? `weight--${st}` : ''} ${isSel ? 'is-selected' : ''}`}
              transform={`translate(${mx} ${my})`}
              onClick={(ev) => { ev.stopPropagation(); onEdgeClick?.(e.uid); }}
              onDoubleClick={(ev) => { ev.stopPropagation(); onEdgeEdit?.(e.uid); }}
              data-testid={`weight-${k}`}
            >
              <rect x={-w / 2} y={-11} width={w} height={22} rx={7} />
              <text textAnchor="middle" dominantBaseline="central">{text}</text>
            </g>
          );
        })}
      </g>

      <g>
        {vertices.map((v, i) => {
          const st = frame?.vertexState[i];
          const isSel = selected?.type === 'vertex' && selected.id === i;
          return (
            <g
              key={i}
              className={`vertex ${st ? `vertex--${st}` : ''} ${isSel ? 'is-selected' : ''} ${edgeStart === i ? 'is-start' : ''}`}
              transform={`translate(${v.x} ${v.y})`}
              role="button"
              aria-label={`Vertex ${i}`}
              data-testid={`vertex-${i}`}
              onPointerDown={(e) => startDrag(e, i)}
              onClick={(e) => vertexClick(e, i)}
            >
              <circle r={21} className="vertex__ring" />
              <circle r={17} className="vertex__body" />
              <text textAnchor="middle" dominantBaseline="central">{i}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
