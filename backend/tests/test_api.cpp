// Integration tests: real HTTP requests against the real routes and algorithms.
#include <gtest/gtest.h>
#include <thread>
#include "ApiHandlers.h"
#include "json.hpp"
using json = nlohmann::json;

class ApiTest : public ::testing::Test {
protected:
    static void SetUpTestSuite() {
        svr = new httplib::Server();
        mst::registerRoutes(*svr);
        port = svr->bind_to_any_port("127.0.0.1");
        th = new std::thread([] { svr->listen_after_bind(); });
        svr->wait_until_ready();
    }
    static void TearDownTestSuite() {
        svr->stop();
        th->join();
        delete th;
        delete svr;
    }
    static httplib::Client client() { return httplib::Client("127.0.0.1", port); }
    static inline httplib::Server* svr = nullptr;
    static inline std::thread* th = nullptr;
    static inline int port = 0;
    static std::string classic() {
        return R"({"vertices":5,"edges":[{"source":0,"destination":1,"weight":2},{"source":0,"destination":2,"weight":4},{"source":1,"destination":2,"weight":1},{"source":1,"destination":3,"weight":7},{"source":2,"destination":3,"weight":3},{"source":2,"destination":4,"weight":5},{"source":3,"destination":4,"weight":6}]})";
    }
};

TEST_F(ApiTest, Health) {
    auto c = client();
    auto res = c.Get("/api/health");
    ASSERT_TRUE(res);
    EXPECT_EQ(res->status, 200);
    json j = json::parse(res->body);
    EXPECT_EQ(j["status"], "ok");
    EXPECT_TRUE(j.contains("version"));
    EXPECT_EQ(res->get_header_value("Access-Control-Allow-Origin"), "*");
}
TEST_F(ApiTest, CorsPreflight) {
    auto c = client();
    auto res = c.Options("/api/mst/kruskal");
    ASSERT_TRUE(res);
    EXPECT_EQ(res->status, 204);
    EXPECT_FALSE(res->get_header_value("Access-Control-Allow-Methods").empty());
}
TEST_F(ApiTest, KruskalAndPrimAgree) {
    auto c = client();
    json k = json::parse(c.Post("/api/mst/kruskal", classic(), "application/json")->body);
    json p = json::parse(c.Post("/api/mst/prim", classic(), "application/json")->body);
    EXPECT_TRUE(k["success"]);
    EXPECT_EQ(k["totalWeight"], 11);
    EXPECT_EQ(p["totalWeight"], 11);
    EXPECT_EQ(k["mstEdgeIds"].size(), 4u);
    EXPECT_TRUE(k["steps"].size() > 4);
    EXPECT_TRUE(k["metrics"].contains("durationMicros"));
}
TEST_F(ApiTest, Compare) {
    auto c = client();
    json j = json::parse(c.Post("/api/mst/compare", classic(), "application/json")->body);
    EXPECT_TRUE(j["weightsMatch"]);
    EXPECT_EQ(j["kruskal"]["algorithm"], "kruskal");
    EXPECT_EQ(j["prim"]["algorithm"], "prim");
}
TEST_F(ApiTest, DisconnectedGraphReportsForest) {
    auto c = client();
    json j = json::parse(c.Post("/api/mst/prim", R"({"vertices":4,"edges":[{"source":0,"destination":1,"weight":3}]})", "application/json")->body);
    EXPECT_EQ(j["components"], 3);
    EXPECT_FALSE(j["isConnected"]);
    EXPECT_EQ(j["mstEdgeIds"].size(), 1u);
}
TEST_F(ApiTest, MalformedJsonIs400) {
    auto c = client();
    auto res = c.Post("/api/mst/kruskal", "{not json", "application/json");
    ASSERT_TRUE(res);
    EXPECT_EQ(res->status, 400);
    EXPECT_FALSE(json::parse(res->body)["success"].get<bool>());
}
TEST_F(ApiTest, InvalidGraphIs422WithDetails) {
    auto c = client();
    auto res = c.Post("/api/mst/kruskal", R"({"vertices":2,"edges":[{"source":0,"destination":7,"weight":1}]})", "application/json");
    ASSERT_TRUE(res);
    EXPECT_EQ(res->status, 422);
    json j = json::parse(res->body);
    EXPECT_EQ(j["code"], "INVALID_GRAPH");
    EXPECT_EQ(j["details"][0]["code"], "INVALID_VERTEX");
}
TEST_F(ApiTest, ValidateEndpoint) {
    auto c = client();
    json ok = json::parse(c.Post("/api/graph/validate", classic(), "application/json")->body);
    EXPECT_TRUE(ok["valid"]);
    json bad = json::parse(c.Post("/api/graph/validate", R"({"vertices":2})", "application/json")->body);
    EXPECT_FALSE(bad["valid"]);
    EXPECT_FALSE(bad["errors"].empty());
}
TEST_F(ApiTest, UnknownEndpointIsJson404) {
    auto c = client();
    auto res = c.Get("/api/nope");
    ASSERT_TRUE(res);
    EXPECT_EQ(res->status, 404);
    EXPECT_FALSE(json::parse(res->body)["success"].get<bool>());
}
TEST_F(ApiTest, ClassifyEndpoint) {
    auto c = client();
    json j = json::parse(c.Post("/api/mst/classify", R"({"vertices":3,"edges":[{"source":0,"destination":1,"weight":1},{"source":1,"destination":2,"weight":1},{"source":0,"destination":2,"weight":1}]})", "application/json")->body);
    EXPECT_EQ(j["counts"]["optional"], 3);
}
TEST_F(ApiTest, OversizedBodyRejected) {
    auto c = client();
    std::string big(3 * 1024 * 1024, ' ');
    auto res = c.Post("/api/mst/kruskal", big, "application/json");
    if (res) EXPECT_EQ(res->status, 413);  // either 413 or a closed connection is acceptable
}
