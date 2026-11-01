#include "ApiHandlers.h"
#include <algorithm>
#include "json.hpp"
#include "Classifier.h"
#include "GraphValidator.h"
#include "Kruskal.h"
#include "Prim.h"
#include "Serialization.h"

namespace mst {
using json = nlohmann::json;

namespace {
void sendJson(httplib::Response& res, int status, const json& body) {
    res.status = status;
    res.set_content(body.dump(), "application/json");
}
void sendError(httplib::Response& res, int status, const std::string& code, const std::string& message, const json& details = json::array()) {
    sendJson(res, status, {{"success", false}, {"error", message}, {"code", code}, {"details", details}});
}

// Parses body into a validated Graph; on failure writes the HTTP error response and returns false.
bool readGraph(const httplib::Request& req, httplib::Response& res, Graph& g, ValidationReport& report) {
    json body = json::parse(req.body, nullptr, /*allow_exceptions=*/false);
    if (body.is_discarded()) {
        sendError(res, 400, "INVALID_JSON", "The request body is not valid JSON.");
        return false;
    }
    if (!parseGraph(body, g, report)) {
        sendError(res, 422, "INVALID_GRAPH", report.errors.empty() ? "Invalid graph." : report.errors.front().message, toJson(report)["errors"]);
        return false;
    }
    return true;
}
}  // namespace

void registerRoutes(httplib::Server& svr) {
    svr.set_payload_max_length(2 * 1024 * 1024);
    svr.set_default_headers({{"Access-Control-Allow-Origin", "*"},
                             {"Access-Control-Allow-Methods", "GET, POST, OPTIONS"},
                             {"Access-Control-Allow-Headers", "Content-Type"}});
    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) { res.status = 204; });

    svr.set_error_handler([](const httplib::Request&, httplib::Response& res) {
        if (res.body.empty()) {
            const std::string msg = res.status == 404 ? "No such endpoint." : res.status == 413 ? "Request body is too large (limit 2 MB)." : "Request failed.";
            sendError(res, res.status, "HTTP_" + std::to_string(res.status), msg);
        }
    });
    svr.set_exception_handler([](const httplib::Request&, httplib::Response& res, std::exception_ptr) {
        sendError(res, 500, "INTERNAL_ERROR", "The server hit an unexpected error while processing the graph.");
    });

    svr.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
        sendJson(res, 200, {{"success", true}, {"status", "ok"}, {"name", "MST Studio backend"}, {"version", VERSION},
                            {"limits", {{"maxVertices", MAX_VERTICES}, {"maxEdges", MAX_EDGES}, {"maxAbsWeight", MAX_ABS_WEIGHT}}}});
    });

    svr.Post("/api/graph/validate", [](const httplib::Request& req, httplib::Response& res) {
        json body = json::parse(req.body, nullptr, false);
        if (body.is_discarded()) return sendError(res, 400, "INVALID_JSON", "The request body is not valid JSON.");
        Graph g;
        ValidationReport report;
        const bool ok = parseGraph(body, g, report);
        json out = toJson(report);
        out["success"] = true;
        out["valid"] = ok;
        if (ok) out["stats"] = {{"vertices", g.n}, {"edges", g.edges.size()}};
        sendJson(res, 200, out);
    });

    svr.Post("/api/mst/kruskal", [](const httplib::Request& req, httplib::Response& res) {
        Graph g; ValidationReport rep;
        if (!readGraph(req, res, g, rep)) return;
        json out = resultToJson(runKruskal(g), g);
        out["warnings"] = toJson(rep)["warnings"];
        sendJson(res, 200, out);
    });

    svr.Post("/api/mst/prim", [](const httplib::Request& req, httplib::Response& res) {
        Graph g; ValidationReport rep;
        if (!readGraph(req, res, g, rep)) return;
        json out = resultToJson(runPrim(g), g);
        out["warnings"] = toJson(rep)["warnings"];
        sendJson(res, 200, out);
    });

    svr.Post("/api/mst/compare", [](const httplib::Request& req, httplib::Response& res) {
        Graph g; ValidationReport rep;
        if (!readGraph(req, res, g, rep)) return;
        MSTResult k = runKruskal(g), p = runPrim(g);
        std::vector<int> ka = k.mstEdgeIds, pa = p.mstEdgeIds;
        std::sort(ka.begin(), ka.end());
        std::sort(pa.begin(), pa.end());
        sendJson(res, 200, {{"success", true},
                            {"vertices", g.n},
                            {"edges", graphToJson(g)["edges"]},
                            {"kruskal", resultToJson(k, g)},
                            {"prim", resultToJson(p, g)},
                            {"weightsMatch", k.totalWeight == p.totalWeight && k.components == p.components},
                            {"sameEdgeSet", ka == pa},
                            {"warnings", toJson(rep)["warnings"]}});
    });

    svr.Post("/api/mst/classify", [](const httplib::Request& req, httplib::Response& res) {
        Graph g; ValidationReport rep;
        if (!readGraph(req, res, g, rep)) return;
        sendJson(res, 200, classificationToJson(classifyEdges(g), g));
    });
}

}  // namespace mst
