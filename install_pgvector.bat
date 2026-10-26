@echo off
:: Batch script to copy pgvector files into PostgreSQL 18 directory (requires Administrator)
setlocal
set "SOURCE=%~dp0scratch\pgvector"
set "TARGET=C:\Program Files\PostgreSQL\18"

echo =====================================================================
echo         Installing pgvector into PostgreSQL 18 (Windows)
echo =====================================================================
echo.
echo Source: %SOURCE%
echo Target: %TARGET%
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrator privileges are required to copy into Program Files.
    echo Please right-click this script and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo Copying extension files...
xcopy /E /Y /I "%SOURCE%\share\extension\*" "%TARGET%\share\extension\"
xcopy /E /Y /I "%SOURCE%\lib\*" "%TARGET%\lib\"
xcopy /E /Y /I "%SOURCE%\include\*" "%TARGET%\include\"

echo.
echo [SUCCESS] pgvector files copied successfully!
echo.
echo Now you can run:
echo   cd backend
echo   .\venv\Scripts\python.exe init_db.py
echo =====================================================================
pause
