import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../services/api.js', async () => {
  class ApiError extends Error {
    constructor(kind, message, details = []) { super(message); this.kind = kind; this.details = details; }
  }
  return { ApiError, runAlgorithm: vi.fn(), compareAlgorithms: vi.fn(), classifyEdges: vi.fn() };
});
import * as api from '../services/api.js';
import App from '../App.jsx';
import beginnerKruskal from './fixtures/beginner-kruskal.json';
import beginnerPrim from './fixtures/beginner-prim.json';
import beginnerCompare from './fixtures/beginner-compare.json';
import disconnectedKruskal from './fixtures/disconnected-kruskal.json';

const BEGINNER_PAYLOAD = {
  vertices: 4,
  edges: [
    { source: 0, destination: 1, weight: 1 }, { source: 1, destination: 2, weight: 2 }, { source: 2, destination: 3, weight: 3 },
    { source: 0, destination: 3, weight: 4 }, { source: 0, destination: 2, weight: 5 },
  ],
};

const click = (name, opts) => userEvent.click(screen.getByRole('button', { name, ...opts }));
async function loadSample(name) {
  await userEvent.click(screen.getByRole('tab', { name: 'Examples' }));
  await userEvent.click(screen.getByRole('button', { name: new RegExp(name, 'i') }));
}
async function openVisualizer() { await userEvent.click(screen.getByRole('button', { name: /Visualizer/ })); }
async function runAlgo() { await userEvent.click(screen.getByRole('button', { name: /Run on C\+\+ backend/ })); }

beforeEach(() => {
  vi.clearAllMocks();
  api.runAlgorithm.mockImplementation(async (algo) => (algo === 'prim' ? beginnerPrim : beginnerKruskal));
  api.compareAlgorithms.mockResolvedValue(beginnerCompare);
  api.classifyEdges.mockResolvedValue({ success: true, classes: [{ id: 0, class: 'critical' }], counts: {} });
});

describe('graph editor', () => {
  it('adds and deletes vertices', async () => {
    render(<App />);
    await click('Clear graph');
    await click('Yes, clear');
    expect(screen.queryByTestId('vertex-0')).toBeNull();
    await click(/Add vertex/);
    const svg = screen.getByTestId('graph-canvas');
    fireEvent.click(svg, { clientX: 100, clientY: 100 });
    fireEvent.click(svg, { clientX: 300, clientY: 200 });
    expect(screen.getByTestId('vertex-0')).toBeInTheDocument();
    expect(screen.getByTestId('vertex-1')).toBeInTheDocument();
    await click(/Select \/ move/);
    fireEvent.click(screen.getByTestId('vertex-0'));
    await click(/Delete selected/);
    expect(screen.queryByTestId('vertex-1')).toBeNull();
    expect(screen.getByTestId('vertex-0')).toBeInTheDocument();
  });

  it('adds an edge through the weight dialog, rejects duplicates, and edits the weight', async () => {
    render(<App />);
    await click('Clear graph');
    await click('Yes, clear');
    await click(/Add vertex/);
    const svg = screen.getByTestId('graph-canvas');
    fireEvent.click(svg, { clientX: 100, clientY: 100 });
    fireEvent.click(svg, { clientX: 300, clientY: 200 });
    await click(/Add edge/);
    fireEvent.click(screen.getByTestId('vertex-0'));
    fireEvent.click(screen.getByTestId('vertex-1'));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Edge weight'), 'abc');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save weight' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/whole number/);
    await userEvent.clear(within(dialog).getByLabelText('Edge weight'));
    await userEvent.type(within(dialog).getByLabelText('Edge weight'), '-4');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save weight' }));
    expect(screen.getByTestId('edge-0')).toBeInTheDocument();
    expect(screen.getByTestId('weight-0')).toHaveTextContent('-4');

    // duplicate edge
    fireEvent.click(screen.getByTestId('vertex-1'));
    fireEvent.click(screen.getByTestId('vertex-0'));
    await userEvent.type(screen.getByLabelText('Edge weight'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Save weight' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/already connected/);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // edit
    await click(/Select \/ move/);
    fireEvent.click(screen.getByTestId('weight-0'));
    await click(/Edit weight/);
    const input = screen.getByLabelText('Edge weight');
    await userEvent.clear(input);
    await userEvent.type(input, '0');
    await userEvent.click(screen.getByRole('button', { name: 'Save weight' }));
    expect(screen.getByTestId('weight-0')).toHaveTextContent('0');
  });

  it('supports undo and redo', async () => {
    render(<App />);
    expect(screen.getByTestId('vertex-6')).toBeInTheDocument();
    await click('Clear graph');
    await click('Yes, clear');
    expect(screen.queryByTestId('vertex-0')).toBeNull();
    await click('Undo');
    expect(screen.getByTestId('vertex-6')).toBeInTheDocument();
    await click('Redo');
    expect(screen.queryByTestId('vertex-0')).toBeNull();
  });

  it('loads every kind of sample graph immediately', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'Examples' }));
    await userEvent.click(screen.getByRole('button', { name: /Small graph for beginners/ }));
    expect(screen.getByTestId('vertex-3')).toBeInTheDocument();
    expect(screen.queryByTestId('vertex-4')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Disconnected graph/ }));
    expect(screen.getByTestId('vertex-7')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Dense graph/ }));
    expect(screen.getByTestId('vertex-23')).toBeInTheDocument();
  });

  it('imports an edge list, matrix and JSON, and shows validation errors', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'Edge list' }));
    fireEvent.change(screen.getByLabelText('Edge list'), { target: { value: '3 2\n0 1 5\n1 2 -2' } });
    await userEvent.click(screen.getByRole('button', { name: 'Load edge list' }));
    expect(screen.getByTestId('vertex-2')).toBeInTheDocument();
    expect(screen.queryByTestId('vertex-3')).toBeNull();

    fireEvent.change(screen.getByLabelText('Edge list'), { target: { value: '3 1\n0 9 5' } });
    await userEvent.click(screen.getByRole('button', { name: 'Load edge list' }));
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(/not a vertex/);

    await userEvent.click(screen.getByRole('tab', { name: 'Matrix' }));
    fireEvent.change(screen.getByLabelText('Adjacency matrix'), { target: { value: '0 1\n2 0' } });
    await userEvent.click(screen.getByRole('button', { name: 'Load matrix' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/not symmetric/);

    await userEvent.click(screen.getByRole('tab', { name: 'JSON' }));
    fireEvent.change(screen.getByLabelText('Graph JSON'), { target: { value: '{bad json' } });
    await userEvent.click(screen.getByRole('button', { name: 'Load JSON' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/valid JSON/);
    fireEvent.change(screen.getByLabelText('Graph JSON'), { target: { value: '{"vertices":2,"edges":[{"source":0,"destination":1,"weight":8}]}' } });
    await userEvent.click(screen.getByRole('button', { name: 'Load JSON' }));
    expect(screen.getByTestId('vertex-1')).toBeInTheDocument();
    expect(screen.getByTestId('weight-0')).toHaveTextContent('8');
  });

  it('exports the graph as a JSON download', async () => {
    const spy = vi.spyOn(URL, 'createObjectURL');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'JSON' }));
    await userEvent.click(screen.getByRole('button', { name: /Export graph/ }));
    expect(spy).toHaveBeenCalledTimes(1);
    const blob = spy.mock.calls[0][0];
    const text = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsText(blob); });
    expect(JSON.parse(text).vertices).toBe(7);
    expect(JSON.parse(text).positions).toHaveLength(7);
  });

  it('builds a graph from the manual form and validates it', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'Manual' }));
    fireEvent.change(screen.getByLabelText('Edge 1 destination'), { target: { value: '9' } });
    await userEvent.click(screen.getByRole('button', { name: 'Build graph' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/not a vertex/);
    fireEvent.change(screen.getByLabelText('Edge 1 destination'), { target: { value: '1' } });
    await userEvent.click(screen.getByRole('button', { name: 'Build graph' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Loaded 4 vertices/);
  });

  it('generates a random graph within limits and refuses invalid options', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'Random' }));
    fireEvent.change(screen.getByLabelText('Random vertices'), { target: { value: '500' } });
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/from 1 to 60/);
    fireEvent.change(screen.getByLabelText('Random vertices'), { target: { value: '5' } });
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(screen.getByTestId('vertex-4')).toBeInTheDocument();
    expect(screen.queryByTestId('vertex-5')).toBeNull();
  });
});

describe('visualizer', () => {
  it('sends the graph to the backend and shows results', async () => {
    render(<App />);
    await loadSample('Small graph for beginners');
    await openVisualizer();
    await runAlgo();
    expect(api.runAlgorithm).toHaveBeenCalledWith('kruskal', BEGINNER_PAYLOAD);
    expect(await screen.findByTestId('result-summary')).toHaveTextContent(/single MST exists/);
    expect(screen.getByTestId('stat-mst-total-weight')).toHaveTextContent('6');
  });

  it('switches algorithms and sends the chosen one', async () => {
    render(<App />);
    await loadSample('Small graph for beginners');
    await openVisualizer();
    const prim = screen.getByRole('radio', { name: /Prim/ });
    await userEvent.click(prim);
    expect(prim).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Kruskal/ })).toHaveAttribute('aria-checked', 'false');
    await runAlgo();
    expect(api.runAlgorithm).toHaveBeenCalledWith('prim', BEGINNER_PAYLOAD);
    expect(await screen.findByTestId('step-explanation')).toBeInTheDocument();
  });

  it('shows validation errors returned by the backend', async () => {
    api.runAlgorithm.mockRejectedValueOnce(new api.ApiError('validation', 'Destination 9 is not a vertex.', [{ message: 'Destination 9 is not a vertex (valid: 0..3).' }]));
    render(<App />);
    await openVisualizer();
    await runAlgo();
    expect(await screen.findByTestId('api-error')).toHaveTextContent(/Destination 9/);
  });

  it('explains when the backend is unavailable', async () => {
    api.runAlgorithm.mockRejectedValueOnce(new api.ApiError('network', 'Cannot reach the C++ backend.'));
    render(<App />);
    await openVisualizer();
    await runAlgo();
    expect(await screen.findByTestId('api-error')).toHaveTextContent(/Cannot reach the C\+\+ backend/);
  });

  it('ignores repeated clicks while a request is running', async () => {
    let resolve;
    api.runAlgorithm.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    render(<App />);
    await openVisualizer();
    const btn = screen.getByRole('button', { name: /Run on C\+\+ backend/ });
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(api.runAlgorithm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Running/ })).toBeDisabled();
    await act(async () => resolve(beginnerKruskal));
  });

  it('steps forward and backward through recorded steps without calling the backend again', async () => {
    render(<App />);
    await loadSample('Small graph for beginners');
    await openVisualizer();
    await runAlgo();
    await screen.findByTestId('step-explanation');
    expect(screen.getByTestId('step-explanation')).toHaveTextContent('Step 1 of');
    await click('Next step');
    await click('Next step');
    expect(screen.getByTestId('step-explanation')).toHaveTextContent('Step 3 of');
    await click('Previous step');
    expect(screen.getByTestId('step-explanation')).toHaveTextContent('Step 2 of');
    await click(/Run to end/);
    expect(screen.getByTestId('step-explanation')).toHaveTextContent(`Step ${beginnerKruskal.steps.length} of`);
    expect(screen.getByTestId('step-mst-weight')).toHaveTextContent('6');
    expect(screen.getByTestId('edge-0').getAttribute('class')).toMatch(/edge--accepted/);
    await click(/Reset/);
    expect(screen.getByTestId('step-explanation')).toHaveTextContent('Step 1 of');
    expect(api.runAlgorithm).toHaveBeenCalledTimes(1);
  });

  it('colours the canvas from the recorded steps (considered edge, then decision)', async () => {
    render(<App />);
    await loadSample('Small graph for beginners');
    await openVisualizer();
    await runAlgo();
    await screen.findByTestId('step-explanation');
    await click('Next step'); // step 2: consider edge 0
    expect(screen.getByTestId('edge-0').getAttribute('class')).toMatch(/edge--current/);
    await click('Next step'); // step 3: accept edge 0
    expect(screen.getByTestId('edge-0').getAttribute('class')).toMatch(/edge--accepted/);
    expect(screen.getByTestId('step-reason')).toHaveTextContent(/Accepted/);
  });

  it('plays and pauses on a timer, and speed changes the pace', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<App />);
      await loadSample('Small graph for beginners');
      await openVisualizer();
      await runAlgo();
      await screen.findByTestId('step-explanation');
      fireEvent.click(screen.getByRole('button', { name: /^Play/ }));
      await act(async () => { vi.advanceTimersByTime(1000); });
      expect(screen.getByTestId('step-explanation')).toHaveTextContent('Step 2 of');
      expect(screen.getByRole('button', { name: /Pause/ })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
      await act(async () => { vi.advanceTimersByTime(5000); });
      expect(screen.getByTestId('step-explanation')).toHaveTextContent('Step 2 of');
      fireEvent.click(screen.getByRole('radio', { name: '4×' }));
      fireEvent.click(screen.getByRole('button', { name: /^Play/ }));
      await act(async () => { vi.advanceTimersByTime(700); });
      expect(screen.getByTestId('step-explanation')).toHaveTextContent('Step 5 of');
      await act(async () => { vi.advanceTimersByTime(20000); });
      expect(screen.getByTestId('step-explanation')).toHaveTextContent(`Step ${beginnerKruskal.steps.length} of`);
      expect(screen.getByRole('button', { name: /^Play/ })).toBeInTheDocument(); // stopped at the end
    } finally {
      vi.useRealTimers();
    }
  });

  it('resets the animation when the algorithm changes', async () => {
    render(<App />);
    await loadSample('Small graph for beginners');
    await openVisualizer();
    await runAlgo();
    await screen.findByTestId('step-explanation');
    await click(/Run to end/);
    await userEvent.click(screen.getByRole('radio', { name: /Prim/ }));
    expect(screen.getByTestId('step-empty')).toBeInTheDocument();
  });

  it('shows results for disconnected graphs as a forest', async () => {
    api.runAlgorithm.mockResolvedValue(disconnectedKruskal);
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'Edge list' }));
    fireEvent.change(screen.getByLabelText('Edge list'), { target: { value: '5 3\n0 1 4\n1 2 2\n3 4 3' } });
    await userEvent.click(screen.getByRole('button', { name: 'Load edge list' }));
    await openVisualizer();
    await runAlgo();
    expect(await screen.findByTestId('result-summary')).toHaveTextContent(/disconnected.*forest/s);
    expect(screen.getByRole('heading', { name: 'Minimum spanning forest' })).toBeInTheDocument();
    expect(screen.getByTestId('stat-single-mst-exists')).toHaveTextContent('No');
    expect(screen.getByTestId('stat-connected-components')).toHaveTextContent('2');
  });

  it('marks results stale when the graph changes', async () => {
    render(<App />);
    await loadSample('Small graph for beginners');
    await openVisualizer();
    await runAlgo();
    await screen.findByTestId('result-summary');
    await userEvent.click(screen.getByRole('button', { name: /Graph Editor/ }));
    await click('Clear graph');
    await click('Yes, clear');
    await openVisualizer();
    expect(screen.queryByTestId('result-summary')).toBeNull();
  });
});

describe('comparison, learn and theme', () => {
  it('runs both algorithms and shows matching weights', async () => {
    render(<App />);
    await loadSample('Small graph for beginners');
    await userEvent.click(screen.getByRole('button', { name: /Algorithm Comparison/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Run both algorithms' }));
    expect(api.compareAlgorithms).toHaveBeenCalledWith(BEGINNER_PAYLOAD);
    expect(await screen.findByTestId('weights-match')).toHaveTextContent(/same minimum total weight: 6/);
    expect(within(screen.getByTestId('compare-table')).getByText('Total weight')).toBeInTheDocument();
  });

  it('shows the educational content', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Learn/ }));
    expect(screen.getByText('What is a spanning tree?')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Glossary' })).toBeInTheDocument();
  });

  it('toggles the theme', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Switch to light theme/ }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
