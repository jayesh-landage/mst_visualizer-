#include "MSTResult.h"

namespace mst {

void finalizeResult(MSTResult& r) {
    r.connected = (r.vertices >= 1 && r.components == 1);
    r.expectedEdges = r.vertices == 0 ? 0 : r.vertices - r.components;
    r.forestSizeVerified = static_cast<int>(r.mstEdgeIds.size()) == r.expectedEdges;
    const std::string w = std::to_string(r.totalWeight);
    const std::string e = std::to_string(r.mstEdgeIds.size());
    if (r.vertices == 0) {
        r.summary = "The graph has no vertices, so there is nothing to span. The result is empty.";
    } else if (r.vertices == 1) {
        r.summary = "A single vertex is trivially its own spanning tree: 0 edges, total weight 0.";
    } else if (r.connected) {
        r.summary = "The graph is connected, so a single MST exists: " + e + " edges (V - 1), total weight " + w + ".";
    } else {
        r.summary = "The graph is disconnected (" + std::to_string(r.components) +
                    " components), so no single spanning tree exists. The minimum spanning forest has " + e +
                    " edges (V - C), total weight " + w + ".";
    }
}

}  // namespace mst
