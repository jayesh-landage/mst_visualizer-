export const RANDOM_LIMITS = { minVertices: 1, maxVertices: 60, maxAbsWeight: 1_000_000 };

// Deterministic PRNG so the same seed always yields the same graph.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function validateRandomOptions(o) {
  const errors = [];
  const L = RANDOM_LIMITS;
  if (!Number.isInteger(o.vertices) || o.vertices < L.minVertices || o.vertices > L.maxVertices)
    errors.push(`Vertices must be a whole number from ${L.minVertices} to ${L.maxVertices}.`);
  if (!(o.density >= 0 && o.density <= 1)) errors.push('Density must be between 0 and 1.');
  if (!Number.isInteger(o.minWeight) || !Number.isInteger(o.maxWeight)) errors.push('Minimum and maximum weights must be whole numbers.');
  else {
    if (o.minWeight > o.maxWeight) errors.push('Minimum weight cannot be larger than the maximum weight.');
    if (Math.abs(o.minWeight) > L.maxAbsWeight || Math.abs(o.maxWeight) > L.maxAbsWeight) errors.push(`Weights must stay within ±${L.maxAbsWeight}.`);
  }
  if (!Number.isInteger(o.seed) || o.seed < 0) errors.push('Seed must be a whole number, 0 or more.');
  if (!o.connected && o.vertices < 2) errors.push('A disconnected graph needs at least 2 vertices.');
  return errors;
}

// density = fraction of all possible edges to include (connected graphs always get at least V-1).
export function generateRandomGraph(options) {
  const errors = validateRandomOptions(options);
  if (errors.length) return { ok: false, errors };
  const { vertices: n, density, minWeight, maxWeight, seed, connected } = options;
  const rnd = mulberry32(seed);
  const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = int(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const order = shuffle([...Array(n).keys()]);
  const side = new Map();
  if (!connected) {
    const cut = int(1, n - 1); // guarantees two non-empty sides, hence disconnected
    order.forEach((v, i) => side.set(v, i < cut ? 0 : 1));
  }
  const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const chosen = new Map();
  const add = (a, b) => chosen.set(key(a, b), { source: Math.min(a, b), destination: Math.max(a, b), weight: int(minWeight, maxWeight) });
  if (connected) for (let i = 1; i < n; i++) add(order[i], order[int(0, i - 1)]); // random spanning tree
  const pool = [];
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) if ((connected || side.get(a) === side.get(b)) && !chosen.has(key(a, b))) pool.push([a, b]);
  const total = (n * (n - 1)) / 2;
  const target = Math.min(chosen.size + pool.length, Math.max(chosen.size, Math.round(density * total)));
  shuffle(pool);
  for (const [a, b] of pool) {
    if (chosen.size >= target) break;
    add(a, b);
  }
  return { ok: true, n, edges: [...chosen.values()] };
}
