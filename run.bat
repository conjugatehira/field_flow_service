@echo off
cd /d "%~dp0"
title FieldFlow Launcher
echo ===== FieldFlow - Setup and Run =====
echo.

:: Check node
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

:: Install deps if missing
if not exist "node_modules\express" (
    echo [1/4] Installing dependencies...
    call npm install
) else (
    echo [1/4] Dependencies already installed
)

:: Run database setup
echo [2/4] Setting up database...
call node db\setup.js

:: Run seed
echo [3/4] Seeding sample data...
call node db\seed.js

:: Kill only the process holding port 4000 (not all node.exe)
echo [4/4] Starting server...
for /f "skip=4 tokens=2 delims=:" %%a in ('netstat -ano ^| findstr /C:":4000 " ^| findstr LISTENING') do (
  for /f %%b in ("%%a") do (
    taskkill /f /pid %%b >nul 2>&1
    timeout /t 1 /nobreak >nul
  )
)

:: Start server with auto-reload in its own window
start "FieldFlow Server" /MIN node --watch server.js
timeout /t 3 /nobreak >nul

echo  Server running at http://localhost:4000
echo  (Auto-reloads on file changes)
echo.
echo  Close the "FieldFlow Server" window to stop.
echo.
start chrome http://localhost:4000
echo  Press any key to exit...
pause >nul
