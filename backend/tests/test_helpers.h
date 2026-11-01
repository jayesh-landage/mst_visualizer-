#pragma once
#include <array>
#include <algorithm>
#include <cstdint>
#include <random>
#include <vector>
#include "Graph.h"
#include "MSTResult.h"
#include "DisjointSetUnion.h"

namespace testutil {
inline mst::Graph makeGraph(int n, std::vector<std::array<int64_t, 3>> list) {
    mst::Graph g;
    g.n = n;
    int id = 0;
    for (auto& t : list) g.edges.push_back({id++, static_cast<int>(t[0]), static_cast<int>(t[1]), t[2]});
    return g;
}
inline int countComponents(const mst::Graph& g) {
    mst::DisjointSetUnion d(g.n);
    for (auto& e : g.edges) d.unite(e.u, e.v);
    return d.components();
}
// Independent check: the chosen edges are acyclic and there are exactly V - C of them.
inline bool isValidForest(const mst::Graph& g, const mst::MSTResult& r) {
    mst::DisjointSetUnion d(g.n);
    for (int id : r.mstEdgeIds) if (!d.unite(g.edges[id].u, g.edges[id].v)) return false;
    return static_cast<int>(r.mstEdgeIds.size()) == g.n - countComponents(g) && d.components() == countComponents(g);
}
// Brute force over all edge subsets (E <= 14): the minimum weight acyclic subset with V - C edges.
inline int64_t bruteForceWeight(const mst::Graph& g) {
    const int m = static_cast<int>(g.edges.size());
    const int need = g.n - countComponents(g);
    int64_t best = INT64_MAX;
    for (int mask = 0; mask < (1 << m); ++mask) {
        if (__builtin_popcount(mask) != need) continue;
        mst::DisjointSetUnion d(g.n);
        int64_t w = 0;
        bool ok = true;
        for (int i = 0; i < m && ok; ++i)
            if (mask >> i & 1) { ok = d.unite(g.edges[i].u, g.edges[i].v); w += g.edges[i].w; }
        if (ok) best = std::min(best, w);
    }
    return g.n == 0 ? 0 : best;
}
inline mst::Graph randomGraph(std::mt19937& rng, int maxN, int maxE, int64_t lo, int64_t hi) {
    mst::Graph g;
    g.n = std::uniform_int_distribution<int>(0, maxN)(rng);
    int m = g.n == 0 ? 0 : std::uniform_int_distribution<int>(0, maxE)(rng);
    for (int i = 0; i < m; ++i)
        g.edges.push_back({i, static_cast<int>(rng() % g.n), static_cast<int>(rng() % g.n),
                           std::uniform_int_distribution<int64_t>(lo, hi)(rng)});
    return g;
}
}  // namespace testutil
