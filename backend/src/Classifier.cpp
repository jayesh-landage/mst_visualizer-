#include "Classifier.h"
#include <algorithm>
#include <functional>
#include <numeric>
#include <unordered_map>
#include "DisjointSetUnion.h"

namespace mst {

const char* toString(EdgeClass c) {
    switch (c) {
        case EdgeClass::Critical: return "critical";
        case EdgeClass::Optional: return "optional";
        default: return "excluded";
    }
}

Classification classifyEdges(const Graph& g) {
    Classification out;
    const int m = static_cast<int>(g.edges.size());
    out.perEdge.assign(m, EdgeClass::Excluded);
    std::vector<int> order(m);
    std::iota(order.begin(), order.end(), 0);
    std::sort(order.begin(), order.end(), [&](int a, int b) {
        if (g.edges[a].w != g.edges[b].w) return g.edges[a].w < g.edges[b].w;
        return a < b;
    });

    DisjointSetUnion dsu(g.n);
    int i = 0;
    while (i < m) {
        int j = i;
        while (j < m && g.edges[order[j]].w == g.edges[order[i]].w) ++j;

        // Edges of this weight whose endpoints are still in different components can appear in some MST.
        struct Item { int id, a, b; };
        std::vector<Item> group;
        for (int k = i; k < j; ++k) {
            const Edge& e = g.edges[order[k]];
            int a = dsu.find(e.u), b = dsu.find(e.v);
            if (a != b) group.push_back({order[k], a, b});
        }

        // Contract components -> local graph; a bridge here is in every MST, otherwise it is optional.
        std::unordered_map<int, int> local;
        for (const Item& it : group) {
            local.emplace(it.a, static_cast<int>(local.size()));
            local.emplace(it.b, static_cast<int>(local.size()));
        }
        const int nl = static_cast<int>(local.size());
        struct Arc { int to, idx; };
        std::vector<std::vector<Arc>> adj(nl);
        for (int k = 0; k < static_cast<int>(group.size()); ++k) {
            int a = local[group[k].a], b = local[group[k].b];
            adj[a].push_back({b, k});
            adj[b].push_back({a, k});
        }
        std::vector<int> tin(nl, -1), low(nl, 0);
        std::vector<char> bridge(group.size(), 0);
        int timer = 0;
        std::function<void(int, int)> dfs = [&](int v, int parentIdx) {
            tin[v] = low[v] = timer++;
            for (const Arc& a : adj[v]) {
                if (a.idx == parentIdx) continue;  // skip only the exact edge => parallel edges are not bridges
                if (tin[a.to] != -1) {
                    low[v] = std::min(low[v], tin[a.to]);
                } else {
                    dfs(a.to, a.idx);
                    low[v] = std::min(low[v], low[a.to]);
                    if (low[a.to] > tin[v]) bridge[a.idx] = 1;
                }
            }
        };
        for (int v = 0; v < nl; ++v) if (tin[v] == -1) dfs(v, -1);

        for (int k = 0; k < static_cast<int>(group.size()); ++k)
            out.perEdge[group[k].id] = bridge[k] ? EdgeClass::Critical : EdgeClass::Optional;
        for (const Item& it : group) dsu.unite(g.edges[it.id].u, g.edges[it.id].v);
        i = j;
    }
    for (EdgeClass c : out.perEdge) {
        if (c == EdgeClass::Critical) ++out.critical;
        else if (c == EdgeClass::Optional) ++out.optional;
        else ++out.excluded;
    }
    return out;
}

}  // namespace mst
