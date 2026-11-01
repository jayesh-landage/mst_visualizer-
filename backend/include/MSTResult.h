#pragma once
#include <cstdint>
#include <string>
#include <vector>
#include "Graph.h"
#include "MSTStep.h"

namespace mst {

struct Metrics {
    int64_t durationMicros = 0;  // algorithm time only, measured in C++
    int considered = 0;
    int accepted = 0;
    int rejected = 0;
    int stepCount = 0;
    int selfLoopsIgnored = 0;
};

struct MSTResult {
    std::string algorithm;
    int vertices = 0;
    int edgeCount = 0;
    std::vector<int> mstEdgeIds;
    int64_t totalWeight = 0;
    int components = 0;
    bool connected = false;          // true => a single MST exists
    int expectedEdges = 0;           // V - C
    bool forestSizeVerified = false; // |mstEdges| == V - C
    std::string summary;
    std::vector<MSTStep> steps;
    Metrics metrics;
};

// Fills connected / expectedEdges / forestSizeVerified / summary from the other fields.
void finalizeResult(MSTResult& r);

}  // namespace mst
