@echo off
REM Starts the PHP Code Visualizer: backend API (PHP built-in server) and
REM frontend dev server, each in its own window. Close either window to stop it.
cd /d "%~dp0"

if not exist "backend\vendor" (
    echo [visualizer] backend\vendor not found - run "composer install" in backend\ first.
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo [visualizer] frontend\node_modules not found - run "npm install" in frontend\ first.
    pause
    exit /b 1
)

start "Visualizer - backend (http://localhost:8000)" cmd /k "cd /d "%~dp0backend" && composer serve"
start "Visualizer - frontend (http://localhost:5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo [visualizer] Backend:  http://localhost:8000
echo [visualizer] Frontend: http://localhost:5173
