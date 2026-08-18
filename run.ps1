param(
    [string]$Target = "backend/tests/fixtures/sample"
)

$ErrorActionPreference = "Stop"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "             PHP Code Visualizer Launcher          " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verify requirements
if (-not (Get-Command php -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] PHP is not found in your PATH. Please install PHP 8.1+ and add it to PATH." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not found in your PATH. Please install Node.js 18+ and add it to PATH." -ForegroundColor Red
    exit 1
}

# 2. Check backend vendor
if (-not (Test-Path "backend/vendor")) {
    Write-Host "[INFO] Installing backend dependencies via Composer..." -ForegroundColor Yellow
    Push-Location backend
    composer install
    Pop-Location
}

# 3. Check frontend node_modules
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "[INFO] Installing frontend dependencies via npm..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
}

# 4. Verify target directory
if (-not (Test-Path $Target)) {
    Write-Host "[ERROR] Target PHP directory not found: $Target" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "frontend/public")) {
    New-Item -ItemType Directory -Force -Path "frontend/public" | Out-Null
}

# 5. Run PHP AST Extraction
Write-Host "[1/2] Analyzing PHP codebase: $Target..." -ForegroundColor Green
php backend/bin/visualize "$Target" "frontend/public/graph.json"

# 6. Launch Frontend Dev Server
Write-Host "[2/2] Starting Visualizer UI and opening browser..." -ForegroundColor Green
Push-Location frontend
npm run dev -- --open
Pop-Location
