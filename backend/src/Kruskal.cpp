#include "Kruskal.h"
#include <algorithm>
#include <chrono>
#include <numeric>
#include "DisjointSetUnion.h"

namespace mst {

namespace {
std::string edgeLabel(const Edge& e) {
    return "(" + std::to_string(e.u) + "-" + std::to_string(e.v) + ", w=" + std::to_string(e.w) + ")";
}
}  // namespace

MSTResult runKruskal(const Graph& g) {
    const auto t0 = std::chrono::steady_clock::now();
    MSTResult r;
    r.algorithm = "kruskal";
    r.vertices = g.n;
    r.edgeCount = static_cast<int>(g.edges.size());

    std::vector<int> order(g.edges.size());
    std::iota(order.begin(), order.end(), 0);
    // Deterministic tie-breaking: weight, then edge id.
    std::sort(order.begin(), order.end(), [&](int a, int b) {
        if (g.edges[a].w != g.edges[b].w) return g.edges[a].w < g.edges[b].w;
        return g.edges[a].id < g.edges[b].id;
    });

    DisjointSetUnion dsu(g.n);
    auto push = [&](MSTStep s) {
        s.index = static_cast<int>(r.steps.size());
        s.mstWeight = r.totalWeight;
        s.accepted = static_cast<int>(r.mstEdgeIds.size());
        r.steps.push_back(std::move(s));
    };

    {
        MSTStep s;
        s.action = "start";
        s.state = "Edges sorted by weight; each vertex is its own component (" + std::to_string(g.n) + " components).";
        s.reason = "Kruskal sorts all " + std::to_string(g.edges.size()) +
                   " edges by weight (ties broken by edge id) and scans them from lightest to heaviest.";
        push(s);
    }

    const int total = static_cast<int>(order.size());
    int position = 0;
    for (int id : order) {
        ++position;
        const Edge& e = g.edges[id];
        const int ru = dsu.find(e.u), rv = dsu.find(e.v);
        ++r.metrics.considered;

        MSTStep c;
        c.action = "consider";
        c.edgeId = e.id; c.source = e.u; c.target = e.v; c.weight = e.w;
        c.reason = "Edge " + std::to_string(position) + " of " + std::to_string(total) + " in sorted order: " + edgeLabel(e) +
                   ". DSU roots: find(" + std::to_string(e.u) + ")=" + std::to_string(ru) +
                   ", find(" + std::to_string(e.v) + ")=" + std::to_string(rv) + ".";
        c.state = std::to_string(dsu.components()) + " components remain.";
        push(c);

        MSTStep d;
        d.edgeId = e.id; d.source = e.u; d.target = e.v; d.weight = e.w;
        if (ru == rv) {
            d.action = "reject";
            ++r.metrics.rejected;
            if (e.u == e.v) {
                d.reason = "Rejected: a self-loop joins a vertex to itself, which would form a cycle of length 1.";
                ++r.metrics.selfLoopsIgnored;
            } else {
                d.reason = "Rejected: both endpoints share root " + std::to_string(ru) +
                           ", so they are already connected. Adding this edge would create a cycle.";
            }
            d.state = std::to_string(dsu.components()) + " components remain.";
        } else {
            dsu.unite(e.u, e.v);
            r.mstEdgeIds.push_back(e.id);
            r.totalWeight += e.w;
            d.action = "accept";
            d.reason = "Accepted: roots " + std::to_string(ru) + " and " + std::to_string(rv) +
                       " differ, so the endpoints lie in different components. The union merges them without a cycle.";
            d.state = std::to_string(dsu.components()) + " components remain.";
        }
        push(d);

        if (g.n > 0 && static_cast<int>(r.mstEdgeIds.size()) == g.n - 1) break;  // spanning tree complete
    }

    r.components = dsu.components();
    r.metrics.accepted = static_cast<int>(r.mstEdgeIds.size());
    finalizeResult(r);

    MSTStep f;
    f.action = "finish";
    f.reason = r.summary;
    f.state = "Done.";
    if (position < total) f.reason += " Remaining " + std::to_string(total - position) + " heavier edges need not be examined.";
    push(f);

    r.metrics.stepCount = static_cast<int>(r.steps.size());
    r.metrics.durationMicros =
        std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now() - t0).count();
    return r;
}

}  // namespace mst
