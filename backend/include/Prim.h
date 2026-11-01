#pragma once
#include "Graph.h"
#include "MSTResult.h"

namespace mst {
// Prim's algorithm with an adjacency list and a binary min-heap ordered by (weight, edge id).
// Disconnected graphs: a new tree is started from the lowest unvisited vertex => minimum spanning forest.
MSTResult runPrim(const Graph& g);
}
