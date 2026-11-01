#include <gtest/gtest.h>
#include "Kruskal.h"
#include "Prim.h"
#include "Classifier.h"
#include "test_helpers.h"
using namespace mst;
using testutil::makeGraph;

static Graph classic() {
    return makeGraph(5, {{0, 1, 2}, {0, 2, 4}, {1, 2, 1}, {1, 3, 7}, {2, 3, 3}, {2, 4, 5}, {3, 4, 6}});
}

TEST(Kruskal, ClassicGraph) {
    Graph g = classic();
    MSTResult r = runKruskal(g);
    EXPECT_EQ(r.totalWeight, 11);  // 1 + 2 + 3 + 5
    EXPECT_EQ(r.mstEdgeIds.size(), 4u);
    EXPECT_TRUE(r.connected);
    EXPECT_TRUE(r.forestSizeVerified);
    EXPECT_EQ(r.components, 1);
    EXPECT_EQ(r.steps.back().action, "finish");
}
TEST(Kruskal, Triangle) {
    MSTResult r = runKruskal(makeGraph(3, {{0, 1, 1}, {1, 2, 2}, {0, 2, 3}}));
    EXPECT_EQ(r.totalWeight, 3);
    EXPECT_EQ(r.metrics.accepted, 2);
}
TEST(Kruskal, RejectedEdgeExplainsCycle) {
    MSTResult r = runKruskal(makeGraph(3, {{0, 1, 1}, {1, 2, 2}, {0, 2, 3}}));
    // Early termination: the heavy edge is never examined once V-1 edges are accepted.
    EXPECT_EQ(r.metrics.considered, 2);
    MSTResult r2 = runKruskal(makeGraph(4, {{0, 1, 1}, {1, 2, 1}, {0, 2, 1}, {2, 3, 5}}));
    bool sawReject = false;
    for (auto& s : r2.steps) if (s.action == "reject") { sawReject = true; EXPECT_NE(s.reason.find("cycle"), std::string::npos); }
    EXPECT_TRUE(sawReject);
}
TEST(Kruskal, EqualWeightsDeterministicByEdgeId) {
    Graph g = makeGraph(3, {{0, 1, 5}, {1, 2, 5}, {0, 2, 5}});
    MSTResult a = runKruskal(g), b = runKruskal(g);
    EXPECT_EQ(a.totalWeight, 10);
    EXPECT_EQ(a.mstEdgeIds, (std::vector<int>{0, 1}));
    EXPECT_EQ(a.mstEdgeIds, b.mstEdgeIds);
}
TEST(Kruskal, NegativeAndZeroWeights) {
    MSTResult r = runKruskal(makeGraph(4, {{0, 1, -5}, {1, 2, 0}, {2, 3, -2}, {0, 3, 4}, {0, 2, 1}}));
    EXPECT_EQ(r.totalWeight, -7);
}
TEST(Kruskal, SelfLoopIsRejected) {
    MSTResult r = runKruskal(makeGraph(2, {{0, 0, -100}, {0, 1, 3}}));
    EXPECT_EQ(r.totalWeight, 3);
    EXPECT_EQ(r.metrics.selfLoopsIgnored, 1);
}
TEST(Kruskal, ParallelEdgesPickLightest) {
    MSTResult r = runKruskal(makeGraph(2, {{0, 1, 9}, {0, 1, 2}, {1, 0, 5}}));
    EXPECT_EQ(r.totalWeight, 2);
    EXPECT_EQ(r.mstEdgeIds.size(), 1u);
}
TEST(Kruskal, SingleVertex) {
    MSTResult r = runKruskal(makeGraph(1, {}));
    EXPECT_EQ(r.totalWeight, 0);
    EXPECT_TRUE(r.connected);
    EXPECT_TRUE(r.mstEdgeIds.empty());
    EXPECT_TRUE(r.forestSizeVerified);
}
TEST(Kruskal, EmptyGraph) {
    MSTResult r = runKruskal(makeGraph(0, {}));
    EXPECT_EQ(r.components, 0);
    EXPECT_FALSE(r.connected);
    EXPECT_TRUE(r.forestSizeVerified);
    EXPECT_NE(r.summary.find("no vertices"), std::string::npos);
}
TEST(Kruskal, DisconnectedGivesForest) {
    Graph g = makeGraph(6, {{0, 1, 1}, {1, 2, 2}, {3, 4, 7}});
    MSTResult r = runKruskal(g);
    EXPECT_EQ(r.components, 3);  // {0,1,2} {3,4} {5}
    EXPECT_FALSE(r.connected);
    EXPECT_EQ(r.mstEdgeIds.size(), 3u);  // V - C
    EXPECT_EQ(r.totalWeight, 10);
    EXPECT_NE(r.summary.find("forest"), std::string::npos);
}
TEST(Kruskal, LargeWeightsNoOverflow) {
    const int64_t big = MAX_ABS_WEIGHT;
    Graph g;
    g.n = 400;
    for (int i = 0; i + 1 < g.n; ++i) g.edges.push_back({i, i, i + 1, big});
    MSTResult r = runKruskal(g);
    EXPECT_EQ(r.totalWeight, big * 399);
    EXPECT_GT(r.totalWeight, static_cast<int64_t>(INT32_MAX));
}
TEST(Kruskal, MatchesPrimAndBruteForceOnRandomGraphs) {
    std::mt19937 rng(12345);
    for (int iter = 0; iter < 400; ++iter) {
        Graph g = testutil::randomGraph(rng, 7, 11, -6, 6);
        MSTResult k = runKruskal(g), p = runPrim(g);
        ASSERT_EQ(k.totalWeight, p.totalWeight) << "iteration " << iter;
        ASSERT_EQ(k.components, p.components);
        ASSERT_EQ(k.totalWeight, testutil::bruteForceWeight(g)) << "iteration " << iter;
        ASSERT_TRUE(testutil::isValidForest(g, k));
        ASSERT_TRUE(testutil::isValidForest(g, p));
        ASSERT_EQ(k.mstEdgeIds.size(), static_cast<size_t>(k.expectedEdges));
    }
}
TEST(Kruskal, StepsAreConsistent) {
    MSTResult r = runKruskal(classic());
    int64_t running = 0;
    int acc = 0;
    for (size_t i = 0; i < r.steps.size(); ++i) {
        EXPECT_EQ(r.steps[i].index, static_cast<int>(i));
        if (r.steps[i].action == "accept") { running += r.steps[i].weight; ++acc; }
        EXPECT_EQ(r.steps[i].mstWeight, running);
        EXPECT_EQ(r.steps[i].accepted, acc);
    }
    EXPECT_EQ(running, r.totalWeight);
}

// ---- Edge classification ----
TEST(Classifier, TriangleWithEqualWeightsAllOptional) {
    Classification c = classifyEdges(makeGraph(3, {{0, 1, 1}, {1, 2, 1}, {0, 2, 1}}));
    EXPECT_EQ(c.optional, 3);
    EXPECT_EQ(c.critical, 0);
}
TEST(Classifier, BridgeIsCriticalAndHeavyCycleEdgeExcluded) {
    Classification c = classifyEdges(makeGraph(4, {{0, 1, 1}, {1, 2, 2}, {0, 2, 3}, {2, 3, 9}}));
    EXPECT_EQ(c.perEdge[0], EdgeClass::Critical);
    EXPECT_EQ(c.perEdge[1], EdgeClass::Critical);
    EXPECT_EQ(c.perEdge[2], EdgeClass::Excluded);
    EXPECT_EQ(c.perEdge[3], EdgeClass::Critical);
}
TEST(Classifier, ParallelEqualEdgesAreOptional) {
    Classification c = classifyEdges(makeGraph(2, {{0, 1, 4}, {0, 1, 4}}));
    EXPECT_EQ(c.optional, 2);
}
TEST(Classifier, AgreesWithBruteForceMembership) {
    std::mt19937 rng(777);
    for (int iter = 0; iter < 150; ++iter) {
        Graph g = testutil::randomGraph(rng, 6, 9, 0, 3);
        Classification c = classifyEdges(g);
        const int m = static_cast<int>(g.edges.size());
        const int64_t best = testutil::bruteForceWeight(g);
        const int need = g.n - testutil::countComponents(g);
        std::vector<int> inSome(m, 0), inAll(m, 0);
        int msts = 0;
        for (int mask = 0; mask < (1 << m); ++mask) {
            if (__builtin_popcount(mask) != need) continue;
            DisjointSetUnion d(g.n);
            int64_t w = 0; bool ok = true;
            for (int i = 0; i < m && ok; ++i) if (mask >> i & 1) { ok = d.unite(g.edges[i].u, g.edges[i].v); w += g.edges[i].w; }
            if (!ok || w != best) continue;
            ++msts;
            for (int i = 0; i < m; ++i) if (mask >> i & 1) ++inSome[i];
        }
        for (int i = 0; i < m; ++i) {
            EdgeClass expect = inSome[i] == 0 ? EdgeClass::Excluded : (inSome[i] == msts ? EdgeClass::Critical : EdgeClass::Optional);
            ASSERT_EQ(c.perEdge[i], expect) << "iter " << iter << " edge " << i;
        }
    }
}
