import { Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward, Repeat } from 'lucide-react';
import { SPEEDS } from '../hooks/useAnimation.js';

export default function AnimationControls({ anim, total, disabled }) {
  const off = disabled || total === 0;
  return (
    <div className="anim" role="group" aria-label="Animation controls">
      <div className="anim__row">
        <button type="button" className="btn btn--icon" onClick={anim.prev} disabled={off || anim.index === 0} aria-label="Previous step"><SkipBack size={16} /></button>
        {anim.playing ? (
          <button type="button" className="btn btn--primary" onClick={anim.pause} disabled={off}><Pause size={16} aria-hidden="true" /> Pause</button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={anim.play} disabled={off}><Play size={16} aria-hidden="true" /> Play</button>
        )}
        <button type="button" className="btn btn--icon" onClick={anim.next} disabled={off || anim.index >= total - 1} aria-label="Next step"><SkipForward size={16} /></button>
        <button type="button" className="btn" onClick={anim.restart} disabled={off}><Repeat size={16} aria-hidden="true" /> Restart</button>
        <button type="button" className="btn" onClick={anim.finish} disabled={off}><FastForward size={16} aria-hidden="true" /> Run to end</button>
        <button type="button" className="btn" onClick={anim.reset} disabled={off}><RotateCcw size={16} aria-hidden="true" /> Reset</button>
      </div>
      <label className="anim__slider">
        <span>Step {total ? anim.index + 1 : 0} of {total}</span>
        <input
          type="range" min={0} max={Math.max(total - 1, 0)} value={anim.index} disabled={off}
          onChange={(e) => anim.goTo(Number(e.target.value))} aria-label="Step progress"
        />
      </label>
      <div className="anim__speed" role="radiogroup" aria-label="Animation speed">
        <span>Speed</span>
        {SPEEDS.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={anim.speed === s} className={`chip ${anim.speed === s ? 'is-active' : ''}`} onClick={() => anim.setSpeed(s)}>{s}×</button>
        ))}
      </div>
    </div>
  );
}
