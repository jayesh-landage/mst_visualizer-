#include "Prim.h"
#include <chrono>
#include <queue>

namespace mst {

namespace {
struct HeapItem {
    int64_t w;
    int id;
    int from;  // tree-side endpoint
    int to;    // endpoint outside the tree when pushed
};
struct HeapGreater {  // min-heap on (weight, id)
    bool operator()(const HeapItem& a, const HeapItem& b) const {
        if (a.w != b.w) return a.w > b.w;
        return a.id > b.id;
    }
};
}  // namespace

MSTResult runPrim(const Graph& g) {
    const auto t0 = std::chrono::steady_clock::now();
    MSTResult r;
    r.algorithm = "prim";
    r.vertices = g.n;
    r.edgeCount = static_cast<int>(g.edges.size());

    struct Adj { int to; int id; };
    std::vector<std::vector<Adj>> adj(g.n);
    for (const Edge& e : g.edges) {
        if (e.u == e.v) { ++r.metrics.selfLoopsIgnored; continue; }  // self-loops can never be in a tree
        adj[e.u].push_back({e.v, e.id});
        adj[e.v].push_back({e.u, e.id});
    }

    std::priority_queue<HeapItem, std::vector<HeapItem>, HeapGreater> pq;
    std::vector<char> visited(g.n, 0);
    int visitedCount = 0, heapSize = 0;

    auto push = [&](MSTStep s) {
        s.index = static_cast<int>(r.steps.size());
        s.mstWeight = r.totalWeight;
        s.accepted = static_cast<int>(r.mstEdgeIds.size());
        r.steps.push_back(std::move(s));
    };
    auto expand = [&](int v, MSTStep& step) {
        for (const Adj& a : adj[v]) {
            if (visited[a.to]) continue;
            pq.push({g.edges[a.id].w, a.id, v, a.to});
            step.pushed.push_back(a.id);
            ++heapSize;
        }
    };

    for (int s = 0; s < g.n; ++s) {
        if (visited[s]) continue;
        ++r.components;
        visited[s] = 1;
        ++visitedCount;
        MSTStep st;
        st.action = "start";
        st.vertex = s;
        st.reason = (r.components == 1)
            ? "Start the tree at vertex " + std::to_string(s) + " (lowest-numbered vertex) and push its edges onto the min-heap."
            : "The heap is empty but vertex " + std::to_string(s) + " is unvisited, so it lies in another component. Start a new tree here (minimum spanning forest).";
        expand(s, st);
        st.state = "Visited " + std::to_string(visitedCount) + "/" + std::to_string(g.n) + " vertices; heap holds " + std::to_string(heapSize) + " candidate edges.";
        push(st);

        while (!pq.empty()) {
            HeapItem top = pq.top();
            pq.pop();
            --heapSize;
            ++r.metrics.considered;
            const Edge& e = g.edges[top.id];

            MSTStep c;
            c.action = "consider";
            c.edgeId = e.id; c.source = top.from; c.target = top.to; c.weight = e.w;
            c.reason = "Pop the lightest candidate from the heap: " + std::to_string(top.from) + "-" + std::to_string(top.to) +
                       " with weight " + std::to_string(e.w) + ".";
            c.state = "Heap holds " + std::to_string(heapSize) + " other candidates.";
            push(c);

            MSTStep d;
            d.edgeId = e.id; d.source = top.from; d.target = top.to; d.weight = e.w;
            if (visited[top.to]) {
                d.action = "skip";
                ++r.metrics.rejected;
                d.reason = "Skipped (stale candidate): vertex " + std::to_string(top.to) +
                           " was already added to the tree through a lighter edge, so this edge would form a cycle.";
                d.state = "Heap holds " + std::to_string(heapSize) + " candidates.";
            } else {
                visited[top.to] = 1;
                ++visitedCount;
                r.mstEdgeIds.push_back(e.id);
                r.totalWeight += e.w;
                d.action = "accept";
                d.vertex = top.to;
                d.reason = "Accepted: it is the cheapest edge leaving the tree and connects tree vertex " + std::to_string(top.from) +
                           " to unvisited vertex " + std::to_string(top.to) + ". Vertex " + std::to_string(top.to) + " joins the tree.";
                expand(top.to, d);
                d.state = "Visited " + std::to_string(visitedCount) + "/" + std::to_string(g.n) + " vertices; heap holds " + std::to_string(heapSize) + " candidates.";
            }
            push(d);
        }
    }

    r.metrics.accepted = static_cast<int>(r.mstEdgeIds.size());
    finalizeResult(r);
    MSTStep f;
    f.action = "finish";
    f.reason = r.summary;
    f.state = "Done.";
    push(f);
    r.metrics.stepCount = static_cast<int>(r.steps.size());
    r.metrics.durationMicros =
        std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now() - t0).count();
    return r;
}

}  // namespace mst
