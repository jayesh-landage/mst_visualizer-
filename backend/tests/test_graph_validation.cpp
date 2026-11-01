#include <gtest/gtest.h>
#include "GraphValidator.h"
using namespace mst;
using json = nlohmann::json;

static bool parse(const json& j, Graph& g, ValidationReport& r) { return parseGraph(j, g, r); }
static bool hasCode(const ValidationReport& r, const std::string& code) {
    for (auto& e : r.errors) if (e.code == code) return true;
    return false;
}

TEST(Validation, AcceptsValidGraph) {
    Graph g; ValidationReport r;
    ASSERT_TRUE(parse(json::parse(R"({"vertices":3,"edges":[{"source":0,"destination":1,"weight":-4},{"source":1,"destination":2,"weight":0}]})"), g, r));
    EXPECT_EQ(g.n, 3);
    EXPECT_EQ(g.edges.size(), 2u);
    EXPECT_EQ(g.edges[0].w, -4);
    EXPECT_EQ(g.edges[1].id, 1);
}
TEST(Validation, EmptyGraphIsValid) {
    Graph g; ValidationReport r;
    EXPECT_TRUE(parse(json::parse(R"({"vertices":0,"edges":[]})"), g, r));
}
TEST(Validation, RejectsNonObject) {
    Graph g; ValidationReport r;
    EXPECT_FALSE(parse(json::parse("[1,2]"), g, r));
    EXPECT_TRUE(hasCode(r, "MALFORMED"));
}
TEST(Validation, MissingFields) {
    Graph g; ValidationReport r;
    EXPECT_FALSE(parse(json::parse("{}"), g, r));
    EXPECT_EQ(r.errors.size(), 2u);
    Graph g2; ValidationReport r2;
    EXPECT_FALSE(parse(json::parse(R"({"vertices":2,"edges":[{"source":0,"destination":1}]})"), g2, r2));
    EXPECT_TRUE(hasCode(r2, "MISSING_FIELD"));
    EXPECT_EQ(r2.errors[0].path, "edges[0].weight");
}
TEST(Validation, InvalidVertexIndex) {
    Graph g; ValidationReport r;
    EXPECT_FALSE(parse(json::parse(R"({"vertices":2,"edges":[{"source":0,"destination":2,"weight":1}]})"), g, r));
    EXPECT_TRUE(hasCode(r, "INVALID_VERTEX"));
    Graph g2; ValidationReport r2;
    EXPECT_FALSE(parse(json::parse(R"({"vertices":2,"edges":[{"source":-1,"destination":1,"weight":1}]})"), g2, r2));
    EXPECT_TRUE(hasCode(r2, "OUT_OF_RANGE"));
}
TEST(Validation, NonIntegerAndWrongTypes) {
    Graph g; ValidationReport r;
    EXPECT_FALSE(parse(json::parse(R"({"vertices":2,"edges":[{"source":0,"destination":1,"weight":1.5}]})"), g, r));
    EXPECT_TRUE(hasCode(r, "NOT_INTEGER"));
    Graph g2; ValidationReport r2;
    EXPECT_FALSE(parse(json::parse(R"({"vertices":"2","edges":[]})"), g2, r2));
    Graph g3; ValidationReport r3;
    EXPECT_FALSE(parse(json::parse(R"({"vertices":2,"edges":"nope"})"), g3, r3));
    Graph g4; ValidationReport r4;
    EXPECT_FALSE(parse(json::parse(R"({"vertices":2,"edges":[5]})"), g4, r4));
}
TEST(Validation, OverflowProtection) {
    Graph g; ValidationReport r;
    EXPECT_FALSE(parse(json::parse(R"({"vertices":2,"edges":[{"source":0,"destination":1,"weight":9223372036854775807}]})"), g, r));
    EXPECT_TRUE(hasCode(r, "OUT_OF_RANGE"));
    Graph g2; ValidationReport r2;
    EXPECT_FALSE(parse(json::parse(R"({"vertices":2,"edges":[{"source":0,"destination":1,"weight":18446744073709551615}]})"), g2, r2));
    Graph g3; ValidationReport r3;
    EXPECT_TRUE(parse(json::parse(R"({"vertices":2,"edges":[{"source":0,"destination":1,"weight":1000000000000}]})"), g3, r3));
}
TEST(Validation, SizeLimits) {
    Graph g; ValidationReport r;
    EXPECT_FALSE(parse(json{{"vertices", MAX_VERTICES + 1}, {"edges", json::array()}}, g, r));
    Graph g2; ValidationReport r2;
    json edges = json::array();
    for (int i = 0; i <= MAX_EDGES; ++i) edges.push_back({{"source", 0}, {"destination", 1}, {"weight", 1}});
    EXPECT_FALSE(parse(json{{"vertices", 2}, {"edges", edges}}, g2, r2));
    EXPECT_TRUE(hasCode(r2, "TOO_MANY_EDGES"));
}
TEST(Validation, SelfLoopsAndParallelEdgesAreWarnings) {
    Graph g; ValidationReport r;
    ASSERT_TRUE(parse(json::parse(R"({"vertices":2,"edges":[{"source":0,"destination":0,"weight":1},{"source":0,"destination":1,"weight":1},{"source":1,"destination":0,"weight":2}]})"), g, r));
    EXPECT_EQ(r.warnings.size(), 2u);
    EXPECT_EQ(g.edges.size(), 3u);
}
TEST(Validation, ErrorListIsCapped) {
    Graph g; ValidationReport r;
    json edges = json::array();
    for (int i = 0; i < 200; ++i) edges.push_back({{"source", 9}, {"destination", 9}, {"weight", 1}});
    EXPECT_FALSE(parse(json{{"vertices", 2}, {"edges", edges}}, g, r));
    EXPECT_LE(r.errors.size(), 50u);
}
