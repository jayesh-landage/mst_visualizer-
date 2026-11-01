import { generateRandomGraph } from './randomGraph.js';

const E = (list) => list.map(([source, destination, weight]) => ({ source, destination, weight }));

const dense = generateRandomGraph({ vertices: 24, density: 1, minWeight: 1, maxWeight: 99, seed: 2024, connected: true });

export const SAMPLES = [
  {
    id: 'beginner',
    name: 'Small graph for beginners',
    description: 'Four vertices, five edges. The MST weighs 6.',
    n: 4,
    edges: E([[0, 1, 1], [1, 2, 2], [2, 3, 3], [0, 3, 4], [0, 2, 5]]),
  },
  {
    id: 'classic',
    name: 'Classic connected weighted graph',
    description: 'Seven vertices, eleven edges. The MST weighs 39.',
    n: 7,
    edges: E([[0, 1, 7], [0, 3, 5], [1, 2, 8], [1, 3, 9], [1, 4, 7], [2, 4, 5], [3, 4, 15], [3, 5, 6], [4, 5, 8], [4, 6, 9], [5, 6, 11]]),
  },
  {
    id: 'multiple',
    name: 'Graph with multiple MSTs',
    description: 'Equal-weight edges form a cycle, so several MSTs share the same weight.',
    n: 5,
    edges: E([[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 0, 1], [0, 2, 3], [3, 4, 2], [2, 4, 2]]),
  },
  {
    id: 'negative',
    name: 'Graph with negative weights',
    description: 'Negative weights are fine for MSTs. The MST weighs -4.',
    n: 6,
    edges: E([[0, 1, -2], [0, 2, 4], [1, 2, 1], [1, 3, 3], [2, 4, -3], [3, 4, 2], [3, 5, 6], [4, 5, -1]]),
  },
  {
    id: 'disconnected',
    name: 'Disconnected graph',
    description: 'Three components, so the result is a minimum spanning forest.',
    n: 8,
    edges: E([[0, 1, 4], [1, 2, 2], [0, 2, 5], [3, 4, 3], [4, 5, 1], [3, 5, 6]]),
  },
  {
    id: 'dense',
    name: 'Dense graph (performance test)',
    description: '24 vertices, every pair connected: 276 edges.',
    n: dense.n,
    edges: dense.edges,
  },
];
