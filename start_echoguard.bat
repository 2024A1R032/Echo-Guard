@echo off
echo =====================================================================
echo           Starting EchoGuard Tactical Defense Platform
echo =====================================================================
echo.
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "EchoGuard Backend" cmd /k "cd backend && .\venv\Scripts\uvicorn app.main:app --reload --port 8000"

echo [2/2] Starting React Frontend on http://localhost:5173 ...
start "EchoGuard Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo System components launched!
echo - Web Dashboard: http://localhost:5173
echo - Backend API Docs: http://127.0.0.1:8000/docs
echo.
echo To run the C++ Edge Simulator:
echo   cd edge_simulator
echo   .\bin\edge_simulator.exe
echo =====================================================================
pause
