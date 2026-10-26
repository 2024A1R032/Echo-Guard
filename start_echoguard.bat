@echo off
setlocal
cd /d "%~dp0"

echo =====================================================================
echo           Starting EchoGuard Tactical Defense Platform
echo =====================================================================
echo.

echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "EchoGuard Backend" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

echo [2/3] Starting React Frontend on http://localhost:5173 ...
start "EchoGuard Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Waiting for services to initialize...
timeout /t 3 /nobreak >nul

echo [3/3] Opening Tactical Dashboard in browser...
start http://localhost:5173

echo.
echo =====================================================================
echo System components launched:
echo  - Tactical Dashboard: http://localhost:5173
echo  - FastAPI Docs:       http://127.0.0.1:8000/docs
echo.
echo To stream real sensor telemetry from C++ Edge Simulator:
echo   cd edge_simulator
echo   .\bin\edge_simulator.exe
echo =====================================================================
echo.
set /p RUN_SIM="Would you like to start the C++ Edge Simulator now? (Y/N): "
if /i "%RUN_SIM%"=="Y" (
    echo Starting C++ Edge Simulator...
    start "EchoGuard Edge Simulator" cmd /k "cd /d "%~dp0edge_simulator" && .\bin\edge_simulator.exe"
)
pause
