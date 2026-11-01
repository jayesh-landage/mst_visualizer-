#include <cstdlib>
#include <iostream>
#include "ApiHandlers.h"

int main(int argc, char** argv) {
    int port = 8080;
    if (const char* p = std::getenv("MST_PORT")) port = std::atoi(p);
    if (argc > 1) port = std::atoi(argv[1]);
    if (port <= 0 || port > 65535) {
        std::cerr << "Invalid port. Usage: mst_server [port]\n";
        return 1;
    }
    httplib::Server svr;
    mst::registerRoutes(svr);
    std::cout << "MST Studio backend " << mst::VERSION << " listening on http://0.0.0.0:" << port << std::endl;
    if (!svr.listen("0.0.0.0", port)) {
        std::cerr << "Could not listen on port " << port << " (is it already in use?)\n";
        return 1;
    }
    return 0;
}
