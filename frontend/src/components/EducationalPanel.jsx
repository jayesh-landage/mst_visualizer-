import { SAMPLES } from '../utils/samples.js';

const SECTIONS = [
  ['What is a spanning tree?', 'A spanning tree of a connected graph uses every vertex and just enough edges to keep them connected: exactly V − 1 edges and no cycles. A graph usually has many spanning trees.'],
  ['What is a minimum spanning tree?', 'Among all spanning trees, the minimum spanning tree (MST) is one whose edge weights add up to the smallest possible total. If several trees tie, they are all MSTs and share the same total weight.'],
  ['Why are MSTs useful?', 'They answer "what is the cheapest way to connect everything?": laying cable or pipes, designing circuits and road networks, clustering data (cutting the heaviest MST edges splits points into groups), and approximating hard problems such as the travelling salesman problem.'],
  ["How does Kruskal's algorithm work?", 'Sort all edges from lightest to heaviest. Walk through them in that order and accept an edge only if its endpoints are in different components. Otherwise it would close a cycle, so reject it. Stop when V − 1 edges are accepted. On a disconnected graph it finishes with a forest.'],
  ["How does Prim's algorithm work?", 'Start from one vertex. Repeatedly take the lightest edge that leaves the current tree and reaches an unvisited vertex, and add that vertex. A min-heap holds candidate edges; when a popped edge points at a vertex already in the tree it is stale and is skipped.'],
  ['Kruskal vs Prim', 'Kruskal looks at the graph globally and merges many small trees into one. Prim grows a single tree outward. Both give the same minimum total weight, though they may pick different edges when weights tie.'],
  ['The role of Disjoint Set Union', 'A DSU answers "are these two vertices already connected?" in near-constant amortized time. find() returns a component representative (with path compression), and union joins two components (by size). Kruskal uses it as its cycle detector.'],
  ['The role of a priority queue', 'Prim needs the cheapest edge leaving the tree at every step. A binary min-heap (std::priority_queue) returns it in O(log n) and accepts new candidates in O(log n).'],
  ['Time and space complexity', 'Kruskal: O(E log E) time, dominated by sorting, plus near-constant DSU work; O(V + E) space. Prim with an adjacency list and binary heap: O((V + E) log V) time, O(V + E) space.'],
  ['Why MSTs have no cycles', 'If a tree contained a cycle, dropping any one edge of it would keep everything connected and not increase the total weight (with positive weights it would decrease it). A minimum tree therefore never needs the cycle.'],
  ['Why negative weights are fine', 'MST algorithms only compare weights; they never add up paths. The cycle and cut arguments hold for any real numbers, so negative and zero weights work. (Shortest-path algorithms like Dijkstra are the ones that struggle with negatives.)'],
  ['Why disconnected graphs have no single spanning tree', 'A spanning tree must connect all vertices, which is impossible when some vertices cannot reach each other. Instead you get a minimum spanning forest: one MST per connected component, with V − C edges for C components.'],
];

const COMPARE = [
  ['Core data structure', 'Disjoint Set Union (+ sorted edge array)', 'Binary min-heap + adjacency list'],
  ['Edge selection', 'Globally lightest edge that joins two components', 'Lightest edge leaving the growing tree'],
  ['Time complexity', 'O(E log E)', 'O((V + E) log V)'],
  ['Sparse graphs', 'Excellent: few edges to sort', 'Excellent'],
  ['Dense graphs', 'Sorting many edges costs more', 'Usually better (O(V²) array version is optimal)'],
  ['Disconnected graph', 'Forest naturally', 'Restarts from each unvisited vertex'],
  ['Total weight', 'Minimum', 'Same minimum'],
];

const GLOSSARY = [
  ['Vertex', 'A point (node) in the graph.'], ['Edge', 'A connection between two vertices.'], ['Weight', 'A number on an edge: its cost or length.'],
  ['Cycle', 'A path that starts and ends at the same vertex without reusing edges.'], ['Connected graph', 'Every vertex can reach every other vertex.'],
  ['Spanning tree', 'A cycle-free set of V − 1 edges connecting all vertices.'], ['DSU', 'Disjoint Set Union: tracks which vertices share a component.'],
  ['Min-heap', 'A structure that always gives back the smallest item first.'], ['Minimum spanning forest', 'An MST for each connected component of a disconnected graph.'],
];

export default function EducationalPanel() {
  return (
    <div className="learn">
      <section className="panel">
        <h2>Learn the ideas</h2>
        <div className="accordion">
          {SECTIONS.map(([q, a], i) => (
            <details key={q} open={i === 0}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Kruskal and Prim side by side</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th /><th>Kruskal</th><th>Prim</th></tr></thead>
            <tbody>{COMPARE.map(([k, a, b]) => <tr key={k}><th scope="row">{k}</th><td>{a}</td><td>{b}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Glossary</h2>
        <dl className="glossary">{GLOSSARY.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
        <p className="muted">Try the {SAMPLES.length} example graphs in the Graph Editor to see these ideas in action.</p>
      </section>
    </div>
  );
}
