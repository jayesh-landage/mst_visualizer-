#include "DisjointSetUnion.h"
#include <numeric>
#include <utility>

namespace mst {

DisjointSetUnion::DisjointSetUnion(int n) : parent_(n), size_(n, 1), components_(n) {
    std::iota(parent_.begin(), parent_.end(), 0);
}

int DisjointSetUnion::find(int x) {
    int root = x;
    while (parent_[root] != root) root = parent_[root];
    while (parent_[x] != root) {  // path compression
        int next = parent_[x];
        parent_[x] = root;
        x = next;
    }
    return root;
}

bool DisjointSetUnion::unite(int a, int b) {
    a = find(a);
    b = find(b);
    if (a == b) return false;
    if (size_[a] < size_[b]) std::swap(a, b);  // union by size
    parent_[b] = a;
    size_[a] += size_[b];
    --components_;
    return true;
}

}  // namespace mst
