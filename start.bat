@echo off
REM MST Studio launcher for Windows: builds the C++ backend if needed, then starts backend + frontend.
setlocal
set "ROOT=%~dp0"
if "%MST_PORT%"=="" set "MST_PORT=8080"

echo == Checking prerequisites
where cmake >nul 2>nul || (echo ERROR: CMake was not found. Install CMake 3.14+ from https://cmake.org/download/ and add it to PATH. & exit /b 1)
where node >nul 2>nul || (echo ERROR: Node.js was not found. Install Node.js 18+ from https://nodejs.org. & exit /b 1)
where npm >nul 2>nul || (echo ERROR: npm was not found. It ships with Node.js. & exit /b 1)
where cl >nul 2>nul && goto compiler_ok
where g++ >nul 2>nul && goto compiler_ok
echo ERROR: No C++ compiler found. Run this from a "x64 Native Tools Command Prompt for VS" (Visual Studio Build Tools) or install MinGW-w64 g++.
exit /b 1
:compiler_ok

set "BIN=%ROOT%backend\build\Release\mst_server.exe"
if not exist "%BIN%" set "BIN=%ROOT%backend\build\mst_server.exe"
if exist "%BIN%" goto built
echo == Building the C++ backend (first run takes a minute or two)
cmake -S "%ROOT%backend" -B "%ROOT%backend\build" -DCMAKE_BUILD_TYPE=Release -DMST_BUILD_TESTS=OFF || (echo ERROR: CMake configuration failed. See README.md Troubleshooting. & exit /b 1)
cmake --build "%ROOT%backend\build" --config Release --target mst_server || (echo ERROR: The C++ backend failed to compile. See README.md Troubleshooting. & exit /b 1)
set "BIN=%ROOT%backend\build\Release\mst_server.exe"
if not exist "%BIN%" set "BIN=%ROOT%backend\build\mst_server.exe"
:built
if not exist "%BIN%" (echo ERROR: mst_server.exe was not produced. & exit /b 1)

if exist "%ROOT%frontend\node_modules" goto deps_ok
echo == Installing frontend dependencies
pushd "%ROOT%frontend"
call npm install --no-audit --no-fund || (echo ERROR: npm install failed. Check your network connection. & popd & exit /b 1)
popd
:deps_ok

echo == Starting the C++ backend on port %MST_PORT% in a new window
start "MST Studio backend" "%BIN%" %MST_PORT%
timeout /t 2 >nul

echo == Starting the frontend (open http://localhost:5173)
cd /d "%ROOT%frontend"
set "VITE_BACKEND_URL=http://localhost:%MST_PORT%"
call npm run dev
echo Close the "MST Studio backend" window to stop the backend.
endlocal
