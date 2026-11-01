#include "Serialization.h"

namespace mst {
using json = nlohmann::json;

json graphToJson(const Graph& g) {
    json edges = json::array();
    for (const Edge& e : g.edges) edges.push_back({{"id", e.id}, {"source", e.u}, {"destination", e.v}, {"weight", e.w}});
    return {{"vertices", g.n}, {"edges", edges}};
}

json resultToJson(const MSTResult& r, const Graph& g) {
    json steps = json::array();
    for (const MSTStep& s : r.steps)
        steps.push_back({{"index", s.index}, {"action", s.action}, {"edgeId", s.edgeId}, {"vertex", s.vertex},
                         {"source", s.source}, {"target", s.target}, {"weight", s.weight}, {"reason", s.reason},
                         {"mstWeight", s.mstWeight}, {"accepted", s.accepted}, {"state", s.state}, {"pushed", s.pushed}});
    json mstEdges = json::array();
    for (int id : r.mstEdgeIds) {
        const Edge& e = g.edges[id];
        mstEdges.push_back({{"id", e.id}, {"source", e.u}, {"destination", e.v}, {"weight", e.w}});
    }
    return {{"success", true},
            {"algorithm", r.algorithm},
            {"vertices", r.vertices},
            {"edgeCount", r.edgeCount},
            {"edges", graphToJson(g)["edges"]},
            {"mstEdgeIds", r.mstEdgeIds},
            {"mstEdges", mstEdges},
            {"totalWeight", r.totalWeight},
            {"components", r.components},
            {"isConnected", r.connected},
            {"expectedEdges", r.expectedEdges},
            {"forestSizeVerified", r.forestSizeVerified},
            {"summary", r.summary},
            {"steps", steps},
            {"metrics", {{"durationMicros", r.metrics.durationMicros}, {"considered", r.metrics.considered},
                         {"accepted", r.metrics.accepted}, {"rejected", r.metrics.rejected},
                         {"stepCount", r.metrics.stepCount}, {"selfLoopsIgnored", r.metrics.selfLoopsIgnored}}}};
}

json classificationToJson(const Classification& c, const Graph& g) {
    json classes = json::array();
    for (const Edge& e : g.edges) classes.push_back({{"id", e.id}, {"class", toString(c.perEdge[e.id])}});
    return {{"success", true},
            {"classes", classes},
            {"counts", {{"critical", c.critical}, {"optional", c.optional}, {"excluded", c.excluded}}}};
}

}  // namespace mst
