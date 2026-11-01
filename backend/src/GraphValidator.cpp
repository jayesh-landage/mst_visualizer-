#include "GraphValidator.h"
#include <set>
#include <utility>

namespace mst {
using json = nlohmann::json;

namespace {
constexpr size_t MAX_REPORTED = 50;
void addError(ValidationReport& r, const char* code, std::string msg, std::string path) {
    if (r.errors.size() < MAX_REPORTED) r.errors.push_back({code, std::move(msg), std::move(path)});
}
// Reads an integer in [lo, hi]; reports an error and returns false otherwise.
bool readInt(const json& j, int64_t lo, int64_t hi, int64_t& out, ValidationReport& r, const std::string& path, const char* what) {
    if (!j.is_number_integer()) {
        addError(r, "NOT_INTEGER", std::string(what) + " must be a whole number.", path);
        return false;
    }
    if (j.is_number_unsigned() && j.get<uint64_t>() > static_cast<uint64_t>(INT64_MAX)) {
        addError(r, "OUT_OF_RANGE", std::string(what) + " is too large.", path);
        return false;
    }
    out = j.get<int64_t>();
    if (out < lo || out > hi) {
        addError(r, "OUT_OF_RANGE", std::string(what) + " must be between " + std::to_string(lo) + " and " + std::to_string(hi) + ".", path);
        return false;
    }
    return true;
}
}  // namespace

bool parseGraph(const json& body, Graph& out, ValidationReport& report) {
    out = Graph{};
    if (!body.is_object()) {
        addError(report, "MALFORMED", "Request body must be a JSON object with \"vertices\" and \"edges\".", "");
        return false;
    }
    if (!body.contains("vertices")) {
        addError(report, "MISSING_FIELD", "Missing field \"vertices\".", "vertices");
    } else {
        int64_t n = 0;
        if (readInt(body["vertices"], 0, MAX_VERTICES, n, report, "vertices", "Vertex count")) out.n = static_cast<int>(n);
    }
    const json* edges = nullptr;
    if (!body.contains("edges")) {
        addError(report, "MISSING_FIELD", "Missing field \"edges\".", "edges");
    } else if (!body["edges"].is_array()) {
        addError(report, "MALFORMED", "\"edges\" must be an array.", "edges");
    } else if (body["edges"].size() > static_cast<size_t>(MAX_EDGES)) {
        addError(report, "TOO_MANY_EDGES", "A graph may have at most " + std::to_string(MAX_EDGES) + " edges.", "edges");
    } else {
        edges = &body["edges"];
    }
    if (!report.ok() || edges == nullptr) return false;

    std::set<std::pair<int, int>> seen;
    int selfLoops = 0, parallel = 0;
    int id = 0;
    for (const json& je : *edges) {
        const std::string base = "edges[" + std::to_string(id) + "]";
        if (!je.is_object()) {
            addError(report, "MALFORMED", "Each edge must be an object with source, destination and weight.", base);
            ++id;
            continue;
        }
        Edge e;
        e.id = id;
        bool ok = true;
        const char* keys[3] = {"source", "destination", "weight"};
        for (const char* k : keys)
            if (!je.contains(k)) { addError(report, "MISSING_FIELD", std::string("Edge is missing \"") + k + "\".", base + "." + k); ok = false; }
        if (ok) {
            int64_t u, v, w;
            bool a = readInt(je["source"], 0, INT32_MAX, u, report, base + ".source", "Source");
            bool b = readInt(je["destination"], 0, INT32_MAX, v, report, base + ".destination", "Destination");
            bool c = readInt(je["weight"], -MAX_ABS_WEIGHT, MAX_ABS_WEIGHT, w, report, base + ".weight", "Weight");
            if (a && u >= out.n) { addError(report, "INVALID_VERTEX", "Source " + std::to_string(u) + " is not a vertex (valid: 0.." + std::to_string(out.n - 1) + ").", base + ".source"); a = false; }
            if (b && v >= out.n) { addError(report, "INVALID_VERTEX", "Destination " + std::to_string(v) + " is not a vertex (valid: 0.." + std::to_string(out.n - 1) + ").", base + ".destination"); b = false; }
            if (a && b && c) {
                e.u = static_cast<int>(u); e.v = static_cast<int>(v); e.w = w;
                if (e.u == e.v) ++selfLoops;
                else if (!seen.insert({std::min(e.u, e.v), std::max(e.u, e.v)}).second) ++parallel;
                out.edges.push_back(e);
            }
        }
        ++id;
    }
    if (selfLoops) report.warnings.push_back({"SELF_LOOPS", std::to_string(selfLoops) + " self-loop(s) found; they can never be part of a spanning tree.", "edges"});
    if (parallel) report.warnings.push_back({"PARALLEL_EDGES", std::to_string(parallel) + " parallel edge(s) found; only the lightest of each pair can be used.", "edges"});
    return report.ok();
}

json toJson(const ValidationReport& r) {
    auto conv = [](const std::vector<ValidationIssue>& v) {
        json a = json::array();
        for (const auto& i : v) a.push_back({{"code", i.code}, {"message", i.message}, {"path", i.path}});
        return a;
    };
    return {{"errors", conv(r.errors)}, {"warnings", conv(r.warnings)}};
}

}  // namespace mst
