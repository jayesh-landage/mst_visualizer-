#pragma once
#include <cstdint>
#include <vector>

namespace mst {

constexpr int MAX_VERTICES = 500;
constexpr int MAX_EDGES = 5000;
constexpr int64_t MAX_ABS_WEIGHT = 1000000000000LL;  // 1e12; 5000 edges sum < 5e15 < 2^63 and < 2^53

// Undirected weighted edge. `id` is the index of the edge in the request array.
struct Edge {
    int id = 0;
    int u = 0;
    int v = 0;
    int64_t w = 0;
};

struct Graph {
    int n = 0;
    std::vector<Edge> edges;
};

}  // namespace mst
