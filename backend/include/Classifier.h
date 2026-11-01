#pragma once
#include <string>
#include <vector>
#include "Graph.h"

namespace mst {

enum class EdgeClass { Critical, Optional, Excluded };

struct Classification {
    std::vector<EdgeClass> perEdge;  // indexed by edge id
    int critical = 0, optional = 0, excluded = 0;
};

// Exact classification via equal-weight groups + bridge detection on the contracted graph:
//  Critical: in every MST (bridge of its weight group), Optional: in some but not all, Excluded: in none.
Classification classifyEdges(const Graph& g);
const char* toString(EdgeClass c);

}  // namespace mst
