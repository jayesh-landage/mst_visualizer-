#pragma once
#include "httplib.h"

namespace mst {
constexpr const char* VERSION = "1.0.0";
// Registers all REST routes, CORS and JSON error handlers on the server.
void registerRoutes(httplib::Server& svr);
}
