@echo off
echo ===================================================
echo   Compiling EchoGuard C++ Edge Simulator
echo ===================================================

if not exist "bin" mkdir bin

g++ -std=c++14 -O2 -Wall -Iinclude src\AcousticSignature.cpp src\EdgeNode.cpp src\HttpClient.cpp src\SimulationEngine.cpp src\main.cpp -o bin\edge_simulator.exe -lws2_32

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Build succeeded! Executable generated at bin\edge_simulator.exe
) else (
    echo.
    echo [ERROR] Build failed with error code %ERRORLEVEL%
)
