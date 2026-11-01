#pragma once
#include "json.hpp"
#include "Classifier.h"
#include "Graph.h"
#include "MSTResult.h"

namespace mst {
nlohmann::json graphToJson(const Graph& g);
nlohmann::json resultToJson(const MSTResult& r, const Graph& g);
nlohmann::json classificationToJson(const Classification& c, const Graph& g);
}
