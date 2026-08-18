@echo off
setlocal enabledelayedexpansion

title PHP Code Visualizer

echo ===================================================
echo             PHP Code Visualizer Launcher
echo ===================================================
echo.

:: 1. Check for prerequisites
where php >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PHP is not found in your PATH. Please install PHP 8.1+ and add it to PATH.
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your PATH. Please install Node.js 18+ and add it to PATH.
    pause
    exit /b 1
)

:: 2. Check backend vendor
if not exist "backend\vendor" (
    echo [INFO] Installing backend dependencies via Composer...
    cd backend
    call composer install
    cd ..
    echo.
)

:: 3. Check frontend node_modules
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies via npm...
    cd frontend
    call npm install
    cd ..
    echo.
)

:: 4. Get target PHP directory
set "TARGET_DIR=%~1"

if "%TARGET_DIR%"=="" (
    echo Enter the path to the PHP codebase you want to visualize.
    echo (Press ENTER to use sample fixture: backend\tests\fixtures\sample)
    set /p "TARGET_DIR=Path: "
)

if "%TARGET_DIR%"=="" (
    set "TARGET_DIR=backend\tests\fixtures\sample"
)

if not exist "%TARGET_DIR%" (
    echo [ERROR] Target directory does not exist: "%TARGET_DIR%"
    pause
    exit /b 1
)

:: Ensure frontend\public exists
if not exist "frontend\public" (
    mkdir "frontend\public"
)

:: 5. Run PHP AST Extraction
echo.
echo [1/2] Analyzing PHP codebase: "%TARGET_DIR%"...
php backend\bin\visualize "%TARGET_DIR%" frontend\public\graph.json
if %errorlevel% neq 0 (
    echo [WARNING] Extraction completed with warnings or issues. Proceeding to visualizer...
) else (
    echo [SUCCESS] Graph generated at frontend\public\graph.json
)

:: 6. Launch Frontend Dev Server
echo.
echo [2/2] Starting Visualizer UI and opening browser...
cd frontend
call npm run dev -- --open

cd ..
