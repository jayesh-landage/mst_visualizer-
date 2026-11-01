import { useCallback, useEffect, useState } from 'react';

export const SPEEDS = [0.5, 1, 2, 4];
const BASE_MS = 900;

// Step playback over a recorded step list of length `total`. Moving backward never reruns the algorithm.
export function useAnimation(total, resetKey) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => { // new graph, algorithm or result => back to the start
    setIndex(0);
    setPlaying(false);
  }, [resetKey]);

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => setIndex((i) => Math.min(i + 1, Math.max(total - 1, 0))), BASE_MS / speed);
    return () => clearInterval(id);
  }, [playing, speed, total]);

  useEffect(() => {
    if (playing && index >= total - 1) setPlaying(false);
  }, [index, playing, total]);

  const play = useCallback(() => {
    if (total === 0) return;
    setIndex((i) => (i >= total - 1 ? 0 : i));
    setPlaying(true);
  }, [total]);
  const pause = useCallback(() => setPlaying(false), []);
  const next = useCallback(() => { setPlaying(false); setIndex((i) => Math.min(i + 1, Math.max(total - 1, 0))); }, [total]);
  const prev = useCallback(() => { setPlaying(false); setIndex((i) => Math.max(i - 1, 0)); }, []);
  const restart = useCallback(() => { setIndex(0); setPlaying(total > 1); }, [total]);
  const reset = useCallback(() => { setIndex(0); setPlaying(false); }, []);
  const finish = useCallback(() => { setPlaying(false); setIndex(Math.max(total - 1, 0)); }, [total]);
  const goTo = useCallback((i) => { setPlaying(false); setIndex(Math.min(Math.max(i, 0), Math.max(total - 1, 0))); }, [total]);

  return { index: Math.min(index, Math.max(total - 1, 0)), playing, speed, setSpeed, play, pause, next, prev, restart, reset, finish, goTo };
}
