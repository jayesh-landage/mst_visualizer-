#include <gtest/gtest.h>
#include <set>
#include "Prim.h"
#include "Kruskal.h"
#include "test_helpers.h"
using namespace mst;
using testutil::makeGraph;

TEST(Prim, ClassicGraph) {
    MSTResult r = runPrim(makeGraph(5, {{0, 1, 2}, {0, 2, 4}, {1, 2, 1}, {1, 3, 7}, {2, 3, 3}, {2, 4, 5}, {3, 4, 6}}));
    EXPECT_EQ(r.totalWeight, 11);
    EXPECT_EQ(r.mstEdgeIds.size(), 4u);
    EXPECT_TRUE(r.connected);
    EXPECT_TRUE(r.forestSizeVerified);
}
TEST(Prim, Triangle) {
    EXPECT_EQ(runPrim(makeGraph(3, {{0, 1, 1}, {1, 2, 2}, {0, 2, 3}})).totalWeight, 3);
}
TEST(Prim, StaleCandidatesAreSkippedWithReason) {
    MSTResult r = runPrim(makeGraph(3, {{0, 1, 1}, {0, 2, 5}, {1, 2, 2}}));
    EXPECT_EQ(r.totalWeight, 3);
    bool skipped = false;
    for (auto& s : r.steps) if (s.action == "skip") { skipped = true; EXPECT_NE(s.reason.find("stale"), std::string::npos); }
    EXPECT_TRUE(skipped);
    EXPECT_EQ(r.metrics.rejected, 1);
}
TEST(Prim, EqualWeightTieBreakIsDeterministic) {
    Graph g = makeGraph(3, {{0, 1, 5}, {1, 2, 5}, {0, 2, 5}});
    EXPECT_EQ(runPrim(g).mstEdgeIds, runPrim(g).mstEdgeIds);
    EXPECT_EQ(runPrim(g).totalWeight, 10);
}
TEST(Prim, NegativeAndZeroWeights) {
    EXPECT_EQ(runPrim(makeGraph(4, {{0, 1, -5}, {1, 2, 0}, {2, 3, -2}, {0, 3, 4}, {0, 2, 1}})).totalWeight, -7);
}
TEST(Prim, SelfLoopsIgnoredAndParallelEdgesHandled) {
    MSTResult r = runPrim(makeGraph(2, {{1, 1, -50}, {0, 1, 9}, {0, 1, 2}}));
    EXPECT_EQ(r.totalWeight, 2);
    EXPECT_EQ(r.metrics.selfLoopsIgnored, 1);
}
TEST(Prim, SingleVertexAndEmpty) {
    MSTResult one = runPrim(makeGraph(1, {}));
    EXPECT_TRUE(one.connected);
    EXPECT_EQ(one.totalWeight, 0);
    MSTResult none = runPrim(makeGraph(0, {}));
    EXPECT_EQ(none.components, 0);
    EXPECT_TRUE(none.forestSizeVerified);
}
TEST(Prim, DisconnectedGivesForest) {
    MSTResult r = runPrim(makeGraph(6, {{0, 1, 1}, {1, 2, 2}, {3, 4, 7}}));
    EXPECT_EQ(r.components, 3);
    EXPECT_EQ(r.mstEdgeIds.size(), 3u);
    EXPECT_EQ(r.totalWeight, 10);
    EXPECT_FALSE(r.connected);
    int starts = 0;
    for (auto& s : r.steps) if (s.action == "start") ++starts;
    EXPECT_EQ(starts, 3);
}
TEST(Prim, LargeWeightsNoOverflow) {
    Graph g;
    g.n = 300;
    for (int i = 0; i + 1 < g.n; ++i) g.edges.push_back({i, i, i + 1, -MAX_ABS_WEIGHT});
    EXPECT_EQ(runPrim(g).totalWeight, -MAX_ABS_WEIGHT * 299);
}
TEST(Prim, HeapFrontierReplayMatchesAccepts) {
    // Replaying `pushed` and `consider` steps must never pop an edge that was not on the frontier.
    std::mt19937 rng(99);
    for (int iter = 0; iter < 100; ++iter) {
        Graph g = testutil::randomGraph(rng, 9, 20, -5, 5);
        MSTResult r = runPrim(g);
        std::set<int> frontier;
        for (auto& s : r.steps) {
            for (int id : s.pushed) frontier.insert(id);
            if (s.action == "consider") ASSERT_EQ(frontier.erase(s.edgeId), 1u);
        }
        ASSERT_TRUE(frontier.empty());
    }
}
TEST(Prim, DenseGraphPerformance) {
    Graph g;
    g.n = 90;
    int id = 0;
    std::mt19937 rng(5);
    for (int i = 0; i < g.n; ++i) for (int j = i + 1; j < g.n; ++j) g.edges.push_back({id++, i, j, static_cast<int64_t>(rng() % 1000)});
    MSTResult p = runPrim(g), k = runKruskal(g);
    EXPECT_EQ(p.totalWeight, k.totalWeight);
    EXPECT_EQ(p.mstEdgeIds.size(), 89u);
}
