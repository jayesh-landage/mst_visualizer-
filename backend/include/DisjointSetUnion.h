#pragma once
#include <vector>

namespace mst {

// Disjoint Set Union with path compression and union by size.
class DisjointSetUnion {
public:
    explicit DisjointSetUnion(int n);
    int find(int x);                 // iterative, with path compression
    bool unite(int a, int b);        // returns false if already in the same set
    int components() const { return components_; }

private:
    std::vector<int> parent_;
    std::vector<int> size_;
    int components_;
};

}  // namespace mst
