#pragma once
#include "Graph.h"
#include "MSTResult.h"

namespace mst {
// Kruskal's algorithm: sort edges by (weight, id), accept an edge iff DSU says it joins two components.
MSTResult runKruskal(const Graph& g);
}
