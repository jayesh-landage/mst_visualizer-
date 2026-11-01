#pragma once
#include <cstdint>
#include <string>
#include <vector>

namespace mst {

// One recorded step of an algorithm run. The frontend replays these to animate.
// action: "start" | "consider" | "accept" | "reject" | "skip" | "finish"
struct MSTStep {
    int index = 0;
    std::string action;
    int edgeId = -1;       // edge in focus (-1 if none)
    int vertex = -1;       // vertex in focus: Prim's newly visited / start vertex
    int source = -1;       // endpoints of the focused edge (Prim: source is the tree side)
    int target = -1;
    int64_t weight = 0;
    std::string reason;
    int64_t mstWeight = 0;  // running MST weight after this step
    int accepted = 0;       // running accepted-edge count after this step
    std::string state;      // short description of algorithm state
    std::vector<int> pushed;  // Prim: edge ids pushed on the heap by this step
};

}  // namespace mst
