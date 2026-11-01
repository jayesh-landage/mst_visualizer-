#pragma once
#include <string>
#include <vector>
#include "json.hpp"
#include "Graph.h"

namespace mst {

struct ValidationIssue {
    std::string code;
    std::string message;
    std::string path;  // e.g. "edges[3].weight"
};

struct ValidationReport {
    std::vector<ValidationIssue> errors;
    std::vector<ValidationIssue> warnings;
    bool ok() const { return errors.empty(); }
};

// Parses and validates a graph request body. On success fills `out`. Never throws.
bool parseGraph(const nlohmann::json& body, Graph& out, ValidationReport& report);
nlohmann::json toJson(const ValidationReport& report);

}  // namespace mst
